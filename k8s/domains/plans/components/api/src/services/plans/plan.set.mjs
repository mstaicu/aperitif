import { buildAccountFeaturesUpdatedV1Event } from "@mstaicu/plans-contracts";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   accountId: string,
 *   planId: string,
 * }) => Promise<{
 *   plan: {
 *     features: Record<string, boolean | number | string>,
 *     id: string,
 *   },
 * }>}
 */
export const set =
  ({ pool }) =>
  async ({ accountId, planId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          SELECT 1
          FROM projected_accounts
          WHERE account_id = $1
          FOR UPDATE
        `,
        [accountId],
      );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const {
        rows: [plan],
      } = await client.query(
        `
          SELECT id
          FROM plans
          WHERE id = $1
        `,
        [planId],
      );

      if (!plan) {
        throw new Error("PLAN_NOT_FOUND");
      }

      const { rows } = await client.query(
        `
          SELECT feature_id, value
          FROM plan_features
          WHERE plan_id = $1
        `,
        [planId],
      );

      const features = Object.fromEntries(
        rows.map((row) => [row.feature_id, row.value]),
      );

      const {
        rows: [currentPlan],
      } = await client.query(
        `
          SELECT plan_id, version
          FROM account_plans
          WHERE account_id = $1
        `,
        [accountId],
      );

      if (currentPlan?.plan_id !== planId) {
        const {
          rows: [accountPlan],
        } = await client.query(
          `
            INSERT INTO account_plans (
              account_id,
              plan_id
            )
            VALUES ($1, $2)
            ON CONFLICT (account_id) DO UPDATE
            SET plan_id = EXCLUDED.plan_id,
              version = account_plans.version + 1
            RETURNING plan_id, version
          `,
          [accountId, planId],
        );

        const event = buildAccountFeaturesUpdatedV1Event(
          {
            account: {
              id: accountId,
            },
            features,
          },
          Number(accountPlan.version),
        );

        await client.query(
          `
            INSERT INTO outbox_events (
              id,
              event
            )
            VALUES ($1, $2::jsonb)
          `,
          [event.id, JSON.stringify(event)],
        );
      }

      await client.query("COMMIT");

      return {
        plan: {
          features,
          id: planId,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };

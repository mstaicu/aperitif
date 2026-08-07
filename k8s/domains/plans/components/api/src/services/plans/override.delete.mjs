import { buildAccountFeaturesUpdatedV1Event } from "@mstaicu/plans-contracts";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   accountId: string,
 *   featureId: string,
 * }) => Promise<{
 *   features: Record<string, boolean | number | string>,
 * }>}
 */
export const deleteOverride =
  ({ pool }) =>
  async ({ accountId, featureId }) => {
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
        rows: [accountPlan],
      } = await client.query(
        `
          SELECT plan_id
          FROM account_plans
          WHERE account_id = $1
        `,
        [accountId],
      );

      if (!accountPlan) {
        throw new Error("ACCOUNT_PLAN_NOT_FOUND");
      }

      const {
        rows: [feature],
      } = await client.query(
        `
          SELECT 1
          FROM features
          WHERE id = $1
        `,
        [featureId],
      );

      if (!feature) {
        throw new Error("FEATURE_NOT_FOUND");
      }

      const { rowCount } = await client.query(
        `
          DELETE FROM account_feature_overrides
          WHERE account_id = $1
            AND feature_id = $2
          RETURNING 1
        `,
        [accountId, featureId],
      );

      const { rows: planFeatures } = await client.query(
        `
          SELECT feature_id, value
          FROM plan_features
          WHERE plan_id = $1
        `,
        [accountPlan.plan_id],
      );

      const { rows: overrides } = await client.query(
        `
          SELECT feature_id, value
          FROM account_feature_overrides
          WHERE account_id = $1
        `,
        [accountId],
      );

      const features = Object.fromEntries(
        [...planFeatures, ...overrides].map((row) => [
          row.feature_id,
          row.value,
        ]),
      );

      if (rowCount === 1) {
        const {
          rows: [{ version }],
        } = await client.query(
          `
            UPDATE account_plans
            SET version = version + 1
            WHERE account_id = $1
            RETURNING version
          `,
          [accountId],
        );

        const event = buildAccountFeaturesUpdatedV1Event(
          {
            account: {
              id: accountId,
            },
            features,
          },
          Number(version),
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

      return { features };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };

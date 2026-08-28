import {
  buildAccountFeaturesChangedV1Event,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import { context, propagation } from "@opentelemetry/api";

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
export const setPlan =
  ({ pool }) =>
  async ({ accountId, planId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const {
        rows: [currentPlan],
      } = await client.query(
        `
          SELECT plan_id
          FROM account_plans
          WHERE account_id = $1
          FOR UPDATE
        `,
        [accountId],
      );

      if (!currentPlan) {
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

      const { rows: planFeatures } = await client.query(
        `
          SELECT feature_id, value
          FROM plan_features
          WHERE plan_id = $1
        `,
        [planId],
      );

      const features = Object.fromEntries(
        planFeatures.map((row) => [row.feature_id, row.value]),
      );

      if (currentPlan.plan_id !== planId) {
        const {
          rows: [{ version }],
        } = await client.query(
          `
            UPDATE account_plans
            SET plan_id = $2,
              version = version + 1
            WHERE account_id = $1
            RETURNING version
          `,
          [accountId, planId],
        );

        const subject = buildAccountFeaturesV1Subject(accountId);
        const event = buildAccountFeaturesChangedV1Event(
          {
            account_id: accountId,
            features,
          },
          Number(version),
        );
        const traceContext = /** @type {Record<string, string>} */ ({});

        propagation.inject(context.active(), traceContext);

        await client.query(
          `
            DELETE FROM outbox_events
            WHERE subject = $1
          `,
          [subject],
        );

        await client.query(
          `
            INSERT INTO outbox_events (
              id,
              subject,
              event,
              traceparent,
              tracestate
            )
            VALUES ($1, $2, $3::jsonb, $4, $5)
          `,
          [
            event.id,
            subject,
            JSON.stringify(event),
            traceContext.traceparent,
            traceContext.tracestate,
          ],
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

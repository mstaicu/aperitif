import { AccountCreatedV1EventCheck } from "@mstaicu/accounts-contracts";
import { buildAccountFeaturesUpdatedV1Event } from "@mstaicu/plans-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{
 *   event: unknown,
 *   pool: import("pg").Pool,
 * }} args
 */
export async function projectAccountCreatedV1({ event, pool }) {
  if (!AccountCreatedV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_CREATED_EVENT");
  }

  const { data } = event;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO projected_accounts (
          account_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (account_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE projected_accounts.version < EXCLUDED.version
      `,
      [data.account.id, data.version],
    );

    const initialPlanId = "free";

    const {
      rows: [accountPlan],
    } = await client.query(
      `
        INSERT INTO account_plans (
          account_id,
          plan_id
        )
        VALUES ($1, $2)
        ON CONFLICT (account_id) DO NOTHING
        RETURNING plan_id, version
      `,
      [data.account.id, initialPlanId],
    );

    if (accountPlan) {
      const { rows } = await client.query(
        `
          SELECT feature_id, value
          FROM plan_features
          WHERE plan_id = $1
        `,
        [accountPlan.plan_id],
      );

      const features = Object.fromEntries(
        rows.map((row) => [row.feature_id, row.value]),
      );

      const accountFeaturesUpdated = buildAccountFeaturesUpdatedV1Event(
        {
          account: { id: data.account.id },
          features,
        },
        Number(accountPlan.version),
      );

      const traceContext = /** @type {Record<string, string>} */ ({});

      propagation.inject(context.active(), traceContext);

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event,
            traceparent,
            tracestate
          )
          VALUES ($1, $2::jsonb, $3, $4)
        `,
        [
          accountFeaturesUpdated.id,
          JSON.stringify(accountFeaturesUpdated),
          traceContext.traceparent,
          traceContext.tracestate,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

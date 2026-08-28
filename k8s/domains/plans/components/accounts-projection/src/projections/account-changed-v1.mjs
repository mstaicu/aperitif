import { AccountChangedV1EventCheck } from "@mstaicu/accounts-contracts";
import {
  buildAccountFeaturesChangedV1Event,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{
 *   event: unknown,
 *   pool: import("pg").Pool,
 * }} args
 */
export async function projectAccountChangedV1({ event, pool }) {
  if (!AccountChangedV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_CHANGED_EVENT");
  }

  const accountChanged =
    /** @type {import("@mstaicu/accounts-contracts").AccountChangedV1Event} */ (
      event
    );
  const { account } = accountChanged.data;

  if (account === null) {
    return;
  }

  const accountId = account.id;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [accountPlan],
    } = await client.query(
      `
        INSERT INTO account_plans (
          account_id,
          plan_id
        )
        VALUES ($1, 'free')
        ON CONFLICT (account_id) DO NOTHING
        RETURNING plan_id, version
      `,
      [accountId],
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

      const accountFeaturesChanged = buildAccountFeaturesChangedV1Event(
        {
          account: { id: accountId },
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
            subject,
            event,
            traceparent,
            tracestate
          )
          VALUES ($1, $2, $3::jsonb, $4, $5)
        `,
        [
          accountFeaturesChanged.id,
          buildAccountFeaturesV1Subject(accountId),
          JSON.stringify(accountFeaturesChanged),
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

import {
  AccountChangedV1EventCheck,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import {
  buildAccountFeaturesChangedV1Event,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

const tracer = trace.getTracer("accounts-projection");

/**
 * @param {{
 *   message: {
 *     headers?: { get(name: string): string | undefined },
 *     json(): unknown,
 *     subject: string,
 *   },
 *   pool: import("pg").Pool,
 * }} args
 */
export async function projectAccountV1({ message, pool }) {
  const parentContext = propagation.extract(context.active(), {
    traceparent: message.headers?.get("traceparent"),
    tracestate: message.headers?.get("tracestate"),
  });

  await tracer.startActiveSpan(
    `process ${message.subject}`,
    {
      attributes: {
        "messaging.destination.name": message.subject,
        "messaging.operation.name": "process",
        "messaging.operation.type": "process",
        "messaging.system": "nats",
      },
      kind: SpanKind.CONSUMER,
    },
    parentContext,
    async (span) => {
      try {
        const event = message.json();

        if (!AccountChangedV1EventCheck.Check(event)) {
          throw new Error("INVALID_ACCOUNT_CHANGED_EVENT");
        }

        const accountChanged =
          /** @type {import("@mstaicu/accounts-contracts").AccountChangedV1Event} */ (
            event
          );

        if (message.subject !== buildAccountV1Subject(accountChanged.data.id)) {
          throw new Error("ACCOUNT_V1_SUBJECT_MISMATCH");
        }

        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          const accountId = accountChanged.data.id;

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
                account_id: accountId,
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
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR });

        if (Error.isError(err)) {
          span.recordException(err);
        }

        throw err;
      } finally {
        span.end();
      }
    },
  );
}

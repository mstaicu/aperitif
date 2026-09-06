import {
  AccountSnapshotV1EventCheck,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import {
  buildAccountFeaturesSnapshotV1Event,
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
export async function projectAccountSnapshotV1({ message, pool }) {
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

        if (!AccountSnapshotV1EventCheck.Check(event)) {
          throw new Error("INVALID_ACCOUNT_SNAPSHOT_EVENT");
        }

        const snapshot =
          /** @type {import("@mstaicu/accounts-contracts").AccountSnapshotV1Event} */ (
            event
          );

        if (message.subject !== buildAccountV1Subject(snapshot.data.id)) {
          throw new Error("ACCOUNT_V1_SUBJECT_MISMATCH");
        }

        const client = await pool.connect();

        try {
          await client.query("BEGIN");

          const {
            data: { id: accountId },
          } = snapshot;

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

            const accountFeaturesSnapshot = buildAccountFeaturesSnapshotV1Event(
              {
                account_id: accountId,
                features,
              },
              Number(accountPlan.version),
            );

            const headers = {
              "Content-Type": "application/cloudevents+json",
            };

            propagation.inject(context.active(), headers);

            await client.query(
              `
                INSERT INTO outbox_messages (
                  id,
                  subject,
                  payload,
                  headers
                )
                VALUES ($1, $2, $3::jsonb, $4::jsonb)
              `,
              [
                accountFeaturesSnapshot.id,
                buildAccountFeaturesV1Subject(accountId),
                JSON.stringify(accountFeaturesSnapshot),
                JSON.stringify(headers),
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

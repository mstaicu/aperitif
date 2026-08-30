import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { setTimeout } from "node:timers/promises";

const POLL_INTERVAL_MS = 1_000;
const PUBLISH_ACK_TIMEOUT_MS = 5_000;
const tracer = trace.getTracer("outbox-relay");

/**
 * @param {{
 *   abortSignal: AbortSignal,
 *   databasePool: import("pg").Pool,
 *   jetStream: import("@nats-io/jetstream").JetStreamClient,
 * }} args
 */
export async function relayOutbox({ abortSignal, databasePool, jetStream }) {
  const databaseClient = await databasePool.connect();

  try {
    while (!abortSignal.aborted) {
      const relayed = await relayNextEntry({ databaseClient, jetStream });

      if (!relayed) {
        await setTimeout(POLL_INTERVAL_MS, undefined, {
          signal: abortSignal,
        }).catch(() => {});
      }
    }
  } finally {
    databaseClient.release();
  }
}

/**
 * @param {{
 *   databaseClient: import("pg").PoolClient,
 *   jetStream: import("@nats-io/jetstream").JetStreamClient,
 * }} args
 */
async function relayNextEntry({ databaseClient, jetStream }) {
  try {
    await databaseClient.query("BEGIN");

    const {
      rows: [outboxEntry],
    } = await databaseClient.query(
      `
        SELECT id,
          event,
          subject,
          traceparent,
          tracestate
        FROM outbox_events
        ORDER BY queued_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (!outboxEntry) {
      await databaseClient.query("COMMIT");
      return false;
    }

    const parentContext = propagation.extract(context.active(), {
      traceparent: outboxEntry.traceparent,
      tracestate: outboxEntry.tracestate,
    });

    await tracer.startActiveSpan(
      `publish ${outboxEntry.event.type}`,
      {
        attributes: {
          "messaging.destination.name": outboxEntry.subject,
          "messaging.message.id": outboxEntry.id,
          "messaging.operation.name": "publish",
          "messaging.operation.type": "send",
          "messaging.system": "nats",
        },
        kind: SpanKind.PRODUCER,
      },
      parentContext,
      async (span) => {
        try {
          const messageHeaders = headers();

          messageHeaders.set("Content-Type", "application/cloudevents");

          propagation.inject(context.active(), messageHeaders, {
            set: (carrier, key, value) => carrier.set(key, value),
          });

          await jetStream.publish(
            outboxEntry.subject,
            JSON.stringify(outboxEntry.event),
            {
              headers: messageHeaders,
              msgID: outboxEntry.id,
              timeout: PUBLISH_ACK_TIMEOUT_MS,
            },
          );
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

    await databaseClient.query(
      `
        DELETE FROM outbox_events
        WHERE id = $1
      `,
      [outboxEntry.id],
    );

    await databaseClient.query("COMMIT");
    return true;
  } catch (err) {
    await databaseClient.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

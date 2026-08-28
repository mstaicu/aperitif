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
const tracer = trace.getTracer("relay");

/**
 * @param {{
 *   js: import("@nats-io/jetstream").JetStreamClient,
 *   pool: import("pg").Pool,
 *   signal: AbortSignal,
 * }} args
 */
export async function drain({ js, pool, signal }) {
  const client = await pool.connect();

  try {
    while (!signal.aborted) {
      const published = await publishNext({ client, js });

      if (!published) {
        await setTimeout(POLL_INTERVAL_MS, undefined, { signal }).catch(
          () => {},
        );
      }
    }
  } finally {
    client.release();
  }
}

/**
 * @param {{
 *   client: import("pg").PoolClient,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 * }} args
 */
async function publishNext({ client, js }) {
  try {
    await client.query("BEGIN");

    const {
      rows: [outboxEvent],
    } = await client.query(
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

    if (!outboxEvent) {
      await client.query("COMMIT");
      return false;
    }

    const parentContext = propagation.extract(context.active(), {
      traceparent: outboxEvent.traceparent,
      tracestate: outboxEvent.tracestate,
    });

    await tracer.startActiveSpan(
      `publish ${outboxEvent.event.type}`,
      {
        attributes: {
          "messaging.destination.name": outboxEvent.subject,
          "messaging.message.id": outboxEvent.id,
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

          await js.publish(
            outboxEvent.subject,
            JSON.stringify(outboxEvent.event),
            {
              headers: messageHeaders,
              msgID: outboxEvent.id,
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

    await client.query(
      `
        DELETE FROM outbox_events
        WHERE id = $1
      `,
      [outboxEvent.id],
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

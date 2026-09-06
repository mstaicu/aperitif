import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { setTimeout } from "node:timers/promises";

const tracer = trace.getTracer("outbox-relay");

/**
 * @param {{
 *   abortSignal: AbortSignal,
 *   pool: import("pg").Pool,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 *   jsm: import("@nats-io/jetstream").JetStreamManager,
 * }} args
 */
export async function relayOutbox({ abortSignal, js, jsm, pool }) {
  const client = await pool.connect();

  try {
    while (!abortSignal.aborted) {
      const relayed = await relayNextEntry({ client, js, jsm });

      if (!relayed) {
        await setTimeout(1_000, undefined, {
          signal: abortSignal,
        }).catch(() => {});
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
 *   jsm: import("@nats-io/jetstream").JetStreamManager,
 * }} args
 */
async function relayNextEntry({ client, js, jsm }) {
  try {
    await client.query("BEGIN");

    const {
      rows: [outboxEntry],
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

    if (!outboxEntry) {
      await client.query("COMMIT");
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

          messageHeaders.set("Content-Type", "application/cloudevents+json");

          propagation.inject(context.active(), messageHeaders, {
            set: (carrier, key, value) => carrier.set(key, value),
          });

          const streamName = await jsm.streams.find(outboxEntry.subject);
          const lastMessage = await jsm.streams.getMessage(streamName, {
            last_by_subj: outboxEntry.subject,
          });

          // Do not publish if the database session failed during the NATS lookup.
          await client.query("SELECT 1");

          await js.publish(
            outboxEntry.subject,
            JSON.stringify(outboxEntry.event),
            {
              expect: {
                lastSubjectSequence: lastMessage?.seq ?? 0,
                streamName,
              },
              headers: messageHeaders,
              msgID: outboxEntry.id,
              timeout: 5_000,
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
      [outboxEntry.id],
    );

    await client.query("COMMIT");

    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  }
}

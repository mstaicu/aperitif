import {
  jetstream,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";
import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { setTimeout } from "node:timers/promises";

/**
 * @param {{
 *   abortSignal: AbortSignal,
 *   nc: import("@nats-io/transport-node").NatsConnection,
 *   pool: import("pg").Pool,
 * }} args
 */
export async function relayOutbox({ abortSignal, nc, pool }) {
  const tracer = trace.getTracer("outbox-relay");

  const js = jetstream(nc);
  const jsm = await js.jetstreamManager();

  const wait = () =>
    setTimeout(1_000, undefined, { signal: abortSignal }).catch(() => {});

  const client = await pool.connect();

  try {
    while (!abortSignal.aborted) {
      try {
        await client.query("BEGIN");

        const {
          rows: [entry],
        } = await client.query(
          `
            SELECT id,
              subject,
              payload,
              headers
            FROM outbox_messages
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `,
        );

        if (!entry) {
          await client.query("COMMIT");
          await wait();
          continue;
        }

        const parent = propagation.extract(context.active(), entry.headers);

        await tracer.startActiveSpan(
          `publish ${entry.subject}`,
          {
            attributes: {
              "messaging.destination.name": entry.subject,
              "messaging.message.id": entry.id,
              "messaging.operation.name": "publish",
              "messaging.operation.type": "send",
              "messaging.system": "nats",
            },
            kind: SpanKind.PRODUCER,
          },
          parent,
          async (span) => {
            try {
              const messageHeaders = headers();

              for (const [name, value] of Object.entries(entry.headers)) {
                if (name.toLowerCase().startsWith("nats-")) {
                  throw new Error(`Reserved NATS header: ${name}`);
                }
                messageHeaders.set(name, value);
              }

              propagation.inject(context.active(), messageHeaders, {
                set: (carrier, key, value) => carrier.set(key, value),
              });

              const streamName = await jsm.streams.find(entry.subject);
              const last = await jsm.streams.getMessage(streamName, {
                last_by_subj: entry.subject,
              });

              await client.query("SELECT 1");

              await js.publish(entry.subject, JSON.stringify(entry.payload), {
                expect: { lastSubjectSequence: last?.seq ?? 0, streamName },
                headers: messageHeaders,
                msgID: entry.id,
              });
            } catch (err) {
              span.setStatus({ code: SpanStatusCode.ERROR });

              if (Error.isError(err)) span.recordException(err);

              throw err;
            } finally {
              span.end();
            }
          },
        );

        await client.query(
          `
            DELETE FROM outbox_messages
            WHERE id = $1
          `,
          [entry.id],
        );

        await client.query("COMMIT");
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          throw err;
        }

        if (
          err instanceof JetStreamApiError &&
          (err.code === JetStreamApiCodes.StreamWrongLastSequence ||
            err.code === JetStreamApiCodes.StreamWrongLastSequenceUnknown)
        ) {
          await wait();
          continue;
        }

        throw err;
      }
    }
  } finally {
    client.release();
  }
}

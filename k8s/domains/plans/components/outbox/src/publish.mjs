import { headers } from "@nats-io/transport-node";
import {
  context,
  propagation,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { on } from "node:events";

const tracer = trace.getTracer("outbox");

/**
 * LISTEN only wakes the outbox process; outbox_events is the source of truth.
 *
 * @param {{
 *   pool: import("pg").Pool,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 *   signal: AbortSignal,
 * }} args
 */
export async function publishEvents({ js, pool, signal }) {
  signal.throwIfAborted();

  const client = await pool.connect();

  try {
    // eslint-disable-next-line
    for await (const _ of drainTriggers({ client, signal })) {
      while (await publishNextEvent({ client, js })) {
        signal.throwIfAborted();
      }
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {{
 *   client: import("pg").PoolClient,
 *   signal: AbortSignal,
 * }} args
 */
async function* drainTriggers({ client, signal }) {
  const OUTBOX_NOTIFY_CHANNEL = "outbox_events";

  await using notifications = on(client, "notification", {
    close: ["end"],
    signal,
  });

  try {
    await client.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);

    // Drain rows that existed before the outbox process started listening.
    yield;

    for await (const [notification] of notifications) {
      if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
        yield;
      }
    }
  } finally {
    await client.query(`UNLISTEN ${OUTBOX_NOTIFY_CHANNEL}`).catch(() => {});
  }
}

/**
 * @param {{
 *   client: import("pg").PoolClient,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 * }} args
 */
async function publishNextEvent({ client, js }) {
  try {
    await client.query("BEGIN");

    const {
      rows: [outboxEvent],
    } = await client.query(
      `
        SELECT id,
          event,
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

    const { event, id, traceparent, tracestate } = outboxEvent;
    const parentContext = propagation.extract(context.active(), {
      traceparent,
      tracestate,
    });

    await tracer.startActiveSpan(
      `${event.type} publish`,
      {
        attributes: {
          "messaging.destination.name": event.type,
          "messaging.message.id": id,
          "messaging.operation.type": "publish",
          "messaging.system": "nats",
        },
        kind: SpanKind.PRODUCER,
      },
      parentContext,
      async (span) => {
        try {
          const messageHeaders = headers();

          propagation.inject(context.active(), messageHeaders, {
            set: (carrier, key, value) => carrier.set(key, value),
          });

          await js.publish(event.type, JSON.stringify(event), {
            headers: messageHeaders,
            msgID: id,
          });
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
      [id],
    );

    await client.query("COMMIT");

    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  }
}

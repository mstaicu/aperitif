import { on } from "node:events";

import { publish } from "./publish.mjs";

/**
 * LISTEN only wakes the outbox process; outbox_events is the source of truth.
 *
 * @param {{
 *   pool: import("pg").Pool,
 *   js: import("@nats-io/jetstream").JetStreamClient,
 *   signal: AbortSignal,
 * }} args
 */
export async function drain({ js, pool, signal }) {
  signal.throwIfAborted();

  const client = await pool.connect();

  try {
    // eslint-disable-next-line no-unused-vars
    for await (const _ of drainTriggers({ client, signal })) {
      while (await drainNextEvent({ client, js })) {
        signal.throwIfAborted();
      }
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    console.error(err);

    throw err;
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
async function drainNextEvent({ client, js }) {
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
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (!outboxEvent) {
      await client.query("COMMIT");
      return false;
    }

    await publish({
      event: outboxEvent.event,
      id: outboxEvent.id,
      js,
      traceparent: outboxEvent.traceparent,
      tracestate: outboxEvent.tracestate,
    });

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

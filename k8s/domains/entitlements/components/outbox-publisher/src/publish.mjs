import { on } from "node:events";

/**
 * LISTEN only wakes the publisher; outbox_events is the source of truth.
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

    // Drain rows that existed before the publisher started listening.
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
          event
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (!outboxEvent) {
      await client.query("COMMIT");
      return false;
    }

    const { event, id } = outboxEvent;

    await js.publish(event.type, JSON.stringify(event), { msgID: id });

    await client.query(
      `
        UPDATE outbox_events
        SET published_at = now()
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

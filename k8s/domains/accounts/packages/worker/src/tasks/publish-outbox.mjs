import { on } from "node:events";

import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

const OUTBOX_NOTIFY_CHANNEL = "outbox_events";

/**
 * LISTEN only wakes the worker; outbox_events is the source of truth.
 *
 * @param {{
 *   db: import("pg").Pool,
 *   nats: import("../platform/nats.mjs").NatsClient,
 * }} resources
 * @param {AbortSignal} signal
 */
export async function runPublishOutbox({ db, nats }, signal) {
  signal.throwIfAborted();

  const client = await db.connect();

  try {
    await client.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);

    // eslint-disable-next-line
    for await (const _ of outboxDrainRequests(client, signal)) {
      while (await publishNextOutboxEvent(client, nats)) {
        signal.throwIfAborted();
      }
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    throw err;
  } finally {
    await client.query(`UNLISTEN ${OUTBOX_NOTIFY_CHANNEL}`).catch(() => {});

    client.release();
  }
}

/**
 * @param {import("pg").PoolClient} client
 * @param {AbortSignal} signal
 */
async function* outboxDrainRequests(client, signal) {
  await using notifications = on(client, "notification", {
    close: ["end"],
    signal,
  });

  // Drain rows that existed before the worker started listening.
  yield;

  for await (const [notification] of notifications) {
    if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
      yield;
    }
  }
}

/**
 * @param {import("pg").PoolClient} client
 * @param {import("../platform/nats.mjs").NatsClient} nats
 * @returns {Promise<boolean>}
 */
async function publishNextOutboxEvent(client, nats) {
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

    await nats.js.publish(event.type, JSON.stringify(event), {
      expect: {
        streamName: ACCOUNTS_STREAM,
      },
      msgID: id,
    });

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

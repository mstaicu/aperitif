import { on } from "node:events";

import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

const OUTBOX_NOTIFY_CHANNEL = "outbox_events";
const OUTBOX_BATCH_SIZE = 10;

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

  const listener = await db.connect();

  try {
    await listener.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);

    // eslint-disable-next-line
    for await (const _ of outboxDrainRequests(listener, signal)) {
      signal.throwIfAborted();

      while (
        (await publishOutboxBatch({ db, nats }, signal)) === OUTBOX_BATCH_SIZE
      ) {
        signal.throwIfAborted();
      }
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    throw err;
  } finally {
    await listener.query(`UNLISTEN ${OUTBOX_NOTIFY_CHANNEL}`).catch(() => {});

    listener.release();
  }
}

/**
 * @param {import("pg").PoolClient} listener
 * @param {AbortSignal} signal
 */
async function* outboxDrainRequests(listener, signal) {
  const notifications = on(listener, "notification", { signal });

  yield;

  for await (const [notification] of notifications) {
    signal.throwIfAborted();

    if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
      yield;
    }
  }
}

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nats: import("../platform/nats.mjs").NatsClient,
 * }} resources
 * @param {AbortSignal} signal
 * @returns {Promise<number>}
 */
async function publishOutboxBatch({ db, nats }, signal) {
  signal.throwIfAborted();

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: outboxEvents } = await client.query(
      `
        SELECT id,
          event
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at, id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [OUTBOX_BATCH_SIZE],
    );

    for (const { event, id } of outboxEvents) {
      await nats.js.publish(event.type, JSON.stringify(event), {
        expect: {
          streamName: ACCOUNTS_STREAM,
        },
        msgID: id,
      });
    }

    if (outboxEvents.length > 0) {
      await client.query(
        `
          UPDATE outbox_events
          SET published_at = now()
          WHERE id = ANY($1::uuid[])
        `,
        [outboxEvents.map(({ id }) => id)],
      );
    }

    await client.query("COMMIT");

    if (outboxEvents.length > 0) {
      console.log(
        JSON.stringify({
          event: "outbox_events_published",
          event_count: outboxEvents.length,
          level: "info",
          service: "accounts-worker",
        }),
      );
    }

    return outboxEvents.length;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    console.error(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        event: "outbox_publish_failed",
        level: "error",
        service: "accounts-worker",
      }),
    );

    throw err;
  } finally {
    client.release();
  }
}

import { on } from "node:events";

import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

const OUTBOX_NOTIFY_CHANNEL = "outbox_events";
const OUTBOX_BATCH_SIZE = 10;
const PUBLISH_ACK_TIMEOUT_MS = 5000;

/**
 * The Postgres notification only wakes the worker. The durable event still
 * comes from outbox_events, so startup drain handles rows left behind before
 * this worker started.
 *
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runPublishOutbox(ctx, signal) {
  signal.throwIfAborted();

  const listener = await ctx.persistence.db.connect();

  try {
    await listener.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);
    const notifications = on(listener, "notification", { signal });

    await drainOutbox(ctx, signal);

    for await (const [notification] of notifications) {
      signal.throwIfAborted();

      if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
        await drainOutbox(ctx, signal);
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
async function drainOutbox(ctx, signal) {
  let publishedCount = await publishOutboxBatch(ctx, signal);

  while (publishedCount === OUTBOX_BATCH_SIZE) {
    publishedCount = await publishOutboxBatch(ctx, signal);
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 * @returns {Promise<number>}
 */
async function publishOutboxBatch(ctx, signal) {
  signal.throwIfAborted();

  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const { rows: outboxEvents } = await client.query(
      `
        SELECT id,
          event
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [OUTBOX_BATCH_SIZE],
    );

    for (const { event, id } of outboxEvents) {
      await ctx.messaging.js.publish(event.subject, JSON.stringify(event), {
        expect: {
          streamName: TENANCY_STREAM,
        },
        msgID: id,
        timeout: PUBLISH_ACK_TIMEOUT_MS,
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

    return outboxEvents.length;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

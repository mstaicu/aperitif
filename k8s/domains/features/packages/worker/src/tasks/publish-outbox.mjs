import { on } from "node:events";

import { FEATURES_STREAM } from "../platform/messaging/features-stream.mjs";

const OUTBOX_NOTIFY_CHANNEL = "outbox_events";
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

    while (await publishNextOutboxEvent(ctx)) {
      signal.throwIfAborted();
    }

    for await (const [notification] of on(listener, "notification", {
      signal,
    })) {
      signal.throwIfAborted();

      if (notification.channel !== OUTBOX_NOTIFY_CHANNEL) {
        continue;
      }

      while (await publishNextOutboxEvent(ctx)) {
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 */
async function publishNextOutboxEvent(ctx) {
  const client = await ctx.persistence.db.connect();

  let keepDraining = false;

  try {
    await client.query("BEGIN");

    const {
      rows: [outboxEvent],
    } = await client.query(
      `
        SELECT position,
          id,
          event
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY position
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (outboxEvent) {
      const { event } = outboxEvent;

      await ctx.messaging.js.publish(event.subject, JSON.stringify(event), {
        expect: {
          streamName: FEATURES_STREAM,
        },
        msgID: outboxEvent.id,
        timeout: PUBLISH_ACK_TIMEOUT_MS,
      });

      await client.query(
        `
          UPDATE outbox_events
          SET published_at = now()
          WHERE position = $1
        `,
        [outboxEvent.position],
      );

      keepDraining = true;
    }

    await client.query("COMMIT");

    return keepDraining;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

import { on } from "node:events";

import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

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
export async function runOutboxPublisher(ctx, signal) {
  const listener = await ctx.persistence.db.connect();
  let destroyListener = false;

  try {
    await listener.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);
    await drainOutbox(ctx);

    for await (const [notification] of on(listener, "notification", {
      signal,
    })) {
      if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
        await drainOutbox(ctx);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }

    destroyListener = true;
    throw err;
  } finally {
    await listener.query(`UNLISTEN ${OUTBOX_NOTIFY_CHANNEL}`).catch(() => {
      destroyListener = true;
    });
    listener.release(destroyListener);
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 */
async function drainOutbox(ctx) {
  let published = true;

  while (published) {
    published = await publishNextOutboxEvent(ctx);
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 */
async function publishNextOutboxEvent(ctx) {
  const client = await ctx.persistence.db.connect();
  let destroyClient = false;

  try {
    await client.query("BEGIN");

    const {
      rows: [event],
    } = await client.query(
      `
        SELECT id,
          subject,
          version,
          payload
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY occurred_at, version, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (!event) {
      await client.query("COMMIT");
      return false;
    }

    await ctx.messaging.js.publish(
      event.subject,
      JSON.stringify({
        payload: event.payload,
        subject: event.subject,
        version: Number(event.version),
      }),
      {
        expect: {
          streamName: TENANCY_STREAM,
        },
        msgID: event.id,
        timeout: PUBLISH_ACK_TIMEOUT_MS,
      },
    );

    await client.query(
      `
        UPDATE outbox_events
        SET published_at = now()
        WHERE id = $1
      `,
      [event.id],
    );

    await client.query("COMMIT");

    return true;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      destroyClient = true;
    }

    throw err;
  } finally {
    client.release(destroyClient);
  }
}

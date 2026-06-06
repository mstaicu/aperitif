import { on } from "node:events";

import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

const OUTBOX_NOTIFY_CHANNEL = "outbox_events";
const OUTBOX_BATCH_SIZE = 10;
const PUBLISH_ACK_TIMEOUT_MS = 5000;

// LISTEN only wakes the worker; outbox_events is the source of truth.
export async function runPublishOutbox(ctx, signal) {
  signal.throwIfAborted();

  const listener = await ctx.persistence.db.connect();

  try {
    await listener.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);
    const notifications = on(listener, "notification", { signal });

    while ((await publishOutboxBatch(ctx, signal)) === OUTBOX_BATCH_SIZE);

    for await (const [notification] of notifications) {
      signal.throwIfAborted();

      if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
        while ((await publishOutboxBatch(ctx, signal)) === OUTBOX_BATCH_SIZE);
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
 * @returns {Promise<number>}
 */
async function publishOutboxBatch(ctx, signal) {
  signal.throwIfAborted();

  const client = await ctx.persistence.db.connect();
  let outboxEvent;

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
      outboxEvent = { event, id };
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

    if (outboxEvents.length > 0) {
      console.log(
        JSON.stringify({
          event: "outbox_events_published",
          event_count: outboxEvents.length,
          level: "info",
          service: "tenancy-worker",
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
        event_id: outboxEvent?.id,
        event_subject: outboxEvent?.event?.subject,
        level: "error",
        service: "tenancy-worker",
      }),
    );

    throw err;
  } finally {
    client.release();
  }
}

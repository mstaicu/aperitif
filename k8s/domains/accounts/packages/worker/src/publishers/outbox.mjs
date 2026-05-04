import { on } from "node:events";

import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

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

  let brokenListener = false;

  try {
    /**
     * Postgres describes NOTIFY as sending an event,
     * with an optional payload,
     * to clients that previously ran LISTEN on that channel.
     */
    await listener.query(`LISTEN ${OUTBOX_NOTIFY_CHANNEL}`);

    while (await publishNextOutboxEvent(ctx)) {
      // Keep draining until no unpublished row is found.
    }

    for await (const [notification] of on(listener, "notification", {
      signal,
    })) {
      if (notification.channel === OUTBOX_NOTIFY_CHANNEL) {
        while (await publishNextOutboxEvent(ctx)) {
          // Keep draining until no unpublished row is found.
        }
      }
    }
  } catch (err) {
    if (Error.isError(err) && err.name === "AbortError") {
      return;
    }

    brokenListener = true;

    throw err;
  } finally {
    await listener.query(`UNLISTEN ${OUTBOX_NOTIFY_CHANNEL}`).catch(() => {
      brokenListener = true;
    });

    listener.release(brokenListener);
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 */
async function publishNextOutboxEvent(ctx) {
  const client = await ctx.persistence.db.connect();

  let brokenClient = false;

  let keepDraining = false;

  try {
    await client.query("BEGIN");

    const {
      rows: [event],
    } = await client.query(
      `
        SELECT id,
          subject,
          version,
          occurred_at,
          producer,
          schema_version,
          payload
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY occurred_at, version, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (event) {
      await ctx.messaging.js.publish(
        event.subject,
        JSON.stringify({
          id: event.id,
          occurred_at:
            event.occurred_at instanceof Date
              ? event.occurred_at.toISOString()
              : new Date(event.occurred_at).toISOString(),
          payload: event.payload,
          producer: event.producer,
          schema_version: Number(event.schema_version),
          subject: event.subject,
          version: Number(event.version),
        }),
        {
          expect: {
            streamName: ACCOUNTS_STREAM,
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

      keepDraining = true;
    }

    await client.query("COMMIT");

    return keepDraining;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      brokenClient = true;
    }

    throw err;
  } finally {
    client.release(brokenClient);
  }
}

import { setInterval } from "node:timers/promises";

import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runOutboxPublisher(ctx, signal) {
  try {
    // eslint-disable-next-line
    for await (const _ of setInterval(1000, undefined, {
      signal,
    })) {
      await publishNextOutboxEvent(ctx);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return;
    }

    throw err;
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 */
async function publishNextOutboxEvent(ctx) {
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const {
      rows: [event],
    } = await client.query(
      `
        SELECT id,
          subject,
          version,
          payload,
          occurred_at
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY occurred_at, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `,
    );

    if (!event) {
      await client.query("COMMIT");
      return false;
    }

    await ctx.messaging.js.publish(event.subject, JSON.stringify(event), {
      expect: {
        streamName: ACCOUNTS_STREAM,
      },
      msgID: event.id,
    });

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
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

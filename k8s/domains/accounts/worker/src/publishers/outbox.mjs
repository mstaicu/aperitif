import { setInterval } from "node:timers/promises";

import { ACCOUNTS_STREAM } from "../platform/messaging/accounts-stream.mjs";

const OUTBOX_POLL_INTERVAL_MS = 1000;
const PUBLISH_ACK_TIMEOUT_MS = 5000;

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runOutboxPublisher(ctx, signal) {
  try {
    // eslint-disable-next-line
    for await (const _ of setInterval(OUTBOX_POLL_INTERVAL_MS, undefined, {
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
      timeout: PUBLISH_ACK_TIMEOUT_MS,
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

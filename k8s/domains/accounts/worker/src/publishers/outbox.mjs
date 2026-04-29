import { setInterval } from "node:timers/promises";

import { ACCOUNTS_STREAM } from "../streams/accounts.mjs";

const BATCH_SIZE = 25;
const POLL_INTERVAL_MS = 1000;

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runOutboxPublisher(ctx, signal) {
  try {
    // eslint-disable-next-line
    for await (const _ of setInterval(POLL_INTERVAL_MS, undefined, {
      signal,
    })) {
      await publishOutboxBatch(ctx);
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
async function publishOutboxBatch(ctx) {
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const { rows: events } = await client.query(
      `
        SELECT id,
          subject,
          aggregate_type,
          aggregate_id,
          aggregate_version,
          payload,
          occurred_at
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY occurred_at, id
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `,
      [BATCH_SIZE],
    );

    for (const event of events) {
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
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

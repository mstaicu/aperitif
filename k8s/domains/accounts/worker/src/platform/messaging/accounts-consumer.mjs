import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
} from "@nats-io/jetstream";

import { ACCOUNTS_STREAM } from "./accounts-stream.mjs";

export const ACCOUNTS_CONSUMER = "accounts-worker";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureAccountsConsumer(ctx) {
  try {
    await ctx.messaging.jsm.consumers.info(ACCOUNTS_STREAM, ACCOUNTS_CONSUMER);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await ctx.messaging.jsm.consumers.add(ACCOUNTS_STREAM, {
      ack_policy: AckPolicy.Explicit,
      deliver_policy: DeliverPolicy.All,
      durable_name: ACCOUNTS_CONSUMER,
      filter_subject: "accounts.>",
      max_ack_pending: 1,
      replay_policy: ReplayPolicy.Instant,
    });
  }
}

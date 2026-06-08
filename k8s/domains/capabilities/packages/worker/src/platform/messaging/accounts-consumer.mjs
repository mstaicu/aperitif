import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
} from "@nats-io/jetstream";

import { AccountMemberUpdatedSubject } from "../../events/accounts.mjs";
import { ACCOUNTS_STREAM } from "./accounts-stream.mjs";

export const ACCOUNTS_CONSUMER = "capabilities-accounts-projection";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureAccountsConsumer(ctx) {
  const createConfig = {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    durable_name: ACCOUNTS_CONSUMER,
    filter_subject: AccountMemberUpdatedSubject,
    max_ack_pending: 1,
    replay_policy: ReplayPolicy.Instant,
  };

  const updateConfig = {
    filter_subject: createConfig.filter_subject,
    max_ack_pending: createConfig.max_ack_pending,
  };

  try {
    await ctx.messaging.jsm.consumers.info(ACCOUNTS_STREAM, ACCOUNTS_CONSUMER);
    await ctx.messaging.jsm.consumers.update(
      ACCOUNTS_STREAM,
      ACCOUNTS_CONSUMER,
      updateConfig,
    );
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await ctx.messaging.jsm.consumers.add(ACCOUNTS_STREAM, createConfig);
  }
}

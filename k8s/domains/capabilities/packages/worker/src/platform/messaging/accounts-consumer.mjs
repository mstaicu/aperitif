import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";

import { AccountMemberUpdatedSubject } from "../../events/accounts.mjs";

export const ACCOUNTS_STREAM = "ACCOUNTS";
export const ACCOUNTS_CONSUMER = "capabilities-accounts-projection";

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureAccountsConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ACCOUNTS_CONSUMER,
    filter_subject: AccountMemberUpdatedSubject,
    max_ack_pending: 1,
  };

  try {
    await nats.jsm.consumers.info(ACCOUNTS_STREAM, ACCOUNTS_CONSUMER);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await nats.jsm.consumers.add(ACCOUNTS_STREAM, config);
  }
}

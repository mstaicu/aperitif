import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";

export const ACCOUNTS_STREAM = "ACCOUNTS";
export const ACCOUNTS_CONSUMER = "documents-accounts-projection";

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureAccountsConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ACCOUNTS_CONSUMER,
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

import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ACCOUNTS_STREAM = "ACCOUNTS";

/**
 * @param {{
 *   nats: import("../nats.mjs").NatsClient,
 *   streamReplicas: number,
 * }} args
 */
export async function ensureAccountsStream({ nats, streamReplicas }) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: ACCOUNTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  };

  try {
    await nats.jsm.streams.info(ACCOUNTS_STREAM);
    await nats.jsm.streams.update(ACCOUNTS_STREAM, config);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.StreamNotFound
      )
    ) {
      throw err;
    }

    await nats.jsm.streams.add(config);
  }
}

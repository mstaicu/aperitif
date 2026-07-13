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
 *   streamMaxBytes: number,
 *   streamReplicas: number,
 * }} args
 */
export async function ensureAccountsStream({
  nats,
  streamMaxBytes,
  streamReplicas,
}) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: streamMaxBytes,
    name: ACCOUNTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  };

  try {
    await nats.jsm.streams.info(ACCOUNTS_STREAM);
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

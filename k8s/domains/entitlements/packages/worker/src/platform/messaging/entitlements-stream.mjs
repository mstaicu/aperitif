import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ENTITLEMENTS_STREAM = "ENTITLEMENTS";

/**
 * @param {{
 *   nats: import("../nats.mjs").NatsClient,
 *   streamReplicas: number,
 * }} args
 */
export async function ensureEntitlementsStream({ nats, streamReplicas }) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: ENTITLEMENTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["entitlements.>"],
  };

  try {
    await nats.jsm.streams.info(ENTITLEMENTS_STREAM);
    await nats.jsm.streams.update(ENTITLEMENTS_STREAM, config);
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

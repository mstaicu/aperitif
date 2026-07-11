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
 *   streamMaxBytes: number,
 *   streamReplicas: number,
 * }} args
 */
export async function ensureEntitlementsStream({
  nats,
  streamMaxBytes,
  streamReplicas,
}) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: streamMaxBytes,
    name: ENTITLEMENTS_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["entitlements.>"],
  };

  try {
    await nats.jsm.streams.info(ENTITLEMENTS_STREAM);
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

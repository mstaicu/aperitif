import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const CAPABILITIES_STREAM = "CAPABILITIES";

/**
 * @param {{
 *   nats: import("../nats.mjs").NatsClient,
 *   streamReplicas: number,
 * }} args
 */
export async function ensureCapabilitiesStream({ nats, streamReplicas }) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: CAPABILITIES_STREAM,
    num_replicas: streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["capabilities.>"],
  };

  try {
    await nats.jsm.streams.info(CAPABILITIES_STREAM);
    await nats.jsm.streams.update(CAPABILITIES_STREAM, config);
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

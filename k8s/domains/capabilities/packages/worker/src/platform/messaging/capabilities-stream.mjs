import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const CAPABILITIES_STREAM = "CAPABILITIES";

/**
 * @param {import("../runtime.mjs").WorkerRuntime} runtime
 */
export async function ensureCapabilitiesStream(runtime) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: CAPABILITIES_STREAM,
    num_replicas: runtime.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["capabilities.>"],
  };

  try {
    await runtime.messaging.jsm.streams.info(CAPABILITIES_STREAM);
    await runtime.messaging.jsm.streams.update(CAPABILITIES_STREAM, config);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.StreamNotFound
      )
    ) {
      throw err;
    }

    await runtime.messaging.jsm.streams.add(config);
  }
}

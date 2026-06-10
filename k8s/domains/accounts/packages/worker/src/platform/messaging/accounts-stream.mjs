import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ACCOUNTS_STREAM = "ACCOUNTS";

/**
 * @param {import("../runtime.mjs").WorkerRuntime} runtime
 */
export async function ensureAccountsStream(runtime) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: ACCOUNTS_STREAM,
    num_replicas: runtime.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  };

  try {
    await runtime.messaging.jsm.streams.info(ACCOUNTS_STREAM);
    await runtime.messaging.jsm.streams.update(ACCOUNTS_STREAM, config);
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

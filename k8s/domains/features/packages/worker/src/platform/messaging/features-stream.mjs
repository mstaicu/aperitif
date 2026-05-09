import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const FEATURES_STREAM = "FEATURES";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureFeaturesStream(ctx) {
  const config = {
    discard: DiscardPolicy.Old,
    max_bytes: 1024 ** 3,
    name: FEATURES_STREAM,
    num_replicas: ctx.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["features.>"],
  };

  try {
    await ctx.messaging.jsm.streams.info(FEATURES_STREAM);
    await ctx.messaging.jsm.streams.update(FEATURES_STREAM, config);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.StreamNotFound
      )
    ) {
      throw err;
    }

    await ctx.messaging.jsm.streams.add(config);
  }
}

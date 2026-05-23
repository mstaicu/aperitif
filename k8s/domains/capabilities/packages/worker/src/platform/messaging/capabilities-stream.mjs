import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const CAPABILITIES_STREAM = "CAPABILITIES";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureCapabilitiesStream(ctx) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: CAPABILITIES_STREAM,
    num_replicas: ctx.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["capabilities.>"],
  };

  try {
    await ctx.messaging.jsm.streams.info(CAPABILITIES_STREAM);
    await ctx.messaging.jsm.streams.update(CAPABILITIES_STREAM, config);
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

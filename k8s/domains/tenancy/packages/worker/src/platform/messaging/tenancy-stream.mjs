import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const TENANCY_STREAM = "TENANCY";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureTenancyStream(ctx) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: TENANCY_STREAM,
    num_replicas: ctx.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["tenancy.>"],
  };

  try {
    await ctx.messaging.jsm.streams.info(TENANCY_STREAM);
    await ctx.messaging.jsm.streams.update(TENANCY_STREAM, config);
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

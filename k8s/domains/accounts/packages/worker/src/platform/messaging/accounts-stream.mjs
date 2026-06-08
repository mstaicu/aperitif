import {
  DiscardPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  RetentionPolicy,
  StorageType,
} from "@nats-io/jetstream";

export const ACCOUNTS_STREAM = "ACCOUNTS";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureAccountsStream(ctx) {
  const config = {
    discard: DiscardPolicy.New,
    max_bytes: 1024 ** 3,
    name: ACCOUNTS_STREAM,
    num_replicas: ctx.app.streamReplicas,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    subjects: ["accounts.>"],
  };

  try {
    await ctx.messaging.jsm.streams.info(ACCOUNTS_STREAM);
    await ctx.messaging.jsm.streams.update(ACCOUNTS_STREAM, config);
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

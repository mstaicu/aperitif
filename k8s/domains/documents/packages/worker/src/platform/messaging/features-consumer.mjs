import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
} from "@nats-io/jetstream";

import { FEATURES_STREAM } from "./features-stream.mjs";

export const FEATURES_CONSUMER = "documents-features-projection";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureFeaturesConsumer(ctx) {
  const createConfig = {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    durable_name: FEATURES_CONSUMER,
    filter_subject: "features.>",
    max_ack_pending: 1,
    replay_policy: ReplayPolicy.Instant,
  };

  const updateConfig = {
    filter_subject: createConfig.filter_subject,
    max_ack_pending: createConfig.max_ack_pending,
  };

  try {
    await ctx.messaging.jsm.consumers.info(FEATURES_STREAM, FEATURES_CONSUMER);
    await ctx.messaging.jsm.consumers.update(
      FEATURES_STREAM,
      FEATURES_CONSUMER,
      updateConfig,
    );
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await ctx.messaging.jsm.consumers.add(FEATURES_STREAM, createConfig);
  }
}

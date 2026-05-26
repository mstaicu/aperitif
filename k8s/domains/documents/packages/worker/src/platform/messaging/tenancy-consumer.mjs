import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
} from "@nats-io/jetstream";

import { TenantMemberUpdatedSubject } from "../../events/tenancy.mjs";
import { TENANCY_STREAM } from "./tenancy-stream.mjs";

export const TENANCY_CONSUMER = "documents-tenancy-projection";

/**
 * @param {import("../context.mjs").WorkerContext} ctx
 */
export async function ensureTenancyConsumer(ctx) {
  const createConfig = {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    durable_name: TENANCY_CONSUMER,
    filter_subjects: [TenantMemberUpdatedSubject],
    max_ack_pending: 1,
    replay_policy: ReplayPolicy.Instant,
  };

  const updateConfig = {
    filter_subject: undefined,
    filter_subjects: createConfig.filter_subjects,
    max_ack_pending: createConfig.max_ack_pending,
  };

  try {
    await ctx.messaging.jsm.consumers.info(TENANCY_STREAM, TENANCY_CONSUMER);
    await ctx.messaging.jsm.consumers.update(
      TENANCY_STREAM,
      TENANCY_CONSUMER,
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

    await ctx.messaging.jsm.consumers.add(TENANCY_STREAM, createConfig);
  }
}

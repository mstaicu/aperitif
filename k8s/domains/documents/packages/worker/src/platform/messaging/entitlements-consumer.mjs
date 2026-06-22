import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";

export const ENTITLEMENTS_STREAM = "ENTITLEMENTS";
export const ENTITLEMENTS_CONSUMER = "documents-entitlements-projection";

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureEntitlementsConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ENTITLEMENTS_CONSUMER,
    max_ack_pending: 1,
  };

  try {
    await nats.jsm.consumers.info(ENTITLEMENTS_STREAM, ENTITLEMENTS_CONSUMER);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await nats.jsm.consumers.add(ENTITLEMENTS_STREAM, config);
  }
}

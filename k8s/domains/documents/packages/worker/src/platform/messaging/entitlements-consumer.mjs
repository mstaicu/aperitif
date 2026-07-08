import { AccountEntitlementsUpdatedV1Type } from "@mstaicu/entitlements-contracts";
import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";

export const ENTITLEMENTS_STREAM = "ENTITLEMENTS";
export const ENTITLEMENTS_CONSUMER = "documents-entitlements-projection";

const HANDLED_ENTITLEMENT_EVENT_TYPES = [AccountEntitlementsUpdatedV1Type];

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureEntitlementsConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ENTITLEMENTS_CONSUMER,
    filter_subjects: HANDLED_ENTITLEMENT_EVENT_TYPES,
  };

  try {
    const existing = await nats.jsm.consumers.info(
      ENTITLEMENTS_STREAM,
      ENTITLEMENTS_CONSUMER,
    );
    const existingFilterSubjects =
      existing.config.filter_subjects ??
      (existing.config.filter_subject ? [existing.config.filter_subject] : []);

    if (
      existing.config.ack_policy !== config.ack_policy ||
      existingFilterSubjects.join("\n") !==
        HANDLED_ENTITLEMENT_EVENT_TYPES.join("\n")
    ) {
      await nats.jsm.consumers.delete(
        ENTITLEMENTS_STREAM,
        ENTITLEMENTS_CONSUMER,
      );
      await nats.jsm.consumers.add(ENTITLEMENTS_STREAM, config);
    }
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

import { AccountEntitlementsUpdatedV1Type } from "@mstaicu/entitlements-contracts";
import {
  AckPolicy,
  jetstream,
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
} from "@nats-io/jetstream";
import { setTimeout } from "node:timers/promises";

export const ENTITLEMENTS_STREAM = "ENTITLEMENTS";
export const ENTITLEMENTS_CONSUMER = "documents-entitlements-projection";

const HANDLED_ENTITLEMENT_EVENT_TYPES = [AccountEntitlementsUpdatedV1Type];

/**
 * @param {{ nc: import("../nats.mjs").NatsConnection }} args
 * @param {AbortSignal} signal
 */
export async function getEntitlementsConsumer({ nc }, signal) {
  const js = jetstream(nc);
  const jsm = await jetstreamManager(nc);

  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ENTITLEMENTS_CONSUMER,
    filter_subjects: HANDLED_ENTITLEMENT_EVENT_TYPES,
  };

  while (true) {
    signal.throwIfAborted();

    try {
      await jsm.consumers.add(ENTITLEMENTS_STREAM, config);
      return await js.consumers.get(ENTITLEMENTS_STREAM, ENTITLEMENTS_CONSUMER);
    } catch (err) {
      const streamIsMissing =
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.StreamNotFound;

      if (!streamIsMissing) {
        throw err;
      }

      await setTimeout(1_000, undefined, { signal });
    }
  }
}

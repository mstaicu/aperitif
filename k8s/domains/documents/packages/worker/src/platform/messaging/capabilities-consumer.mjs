import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";

import { AccountCapabilitiesUpdatedSubject } from "../../events/capabilities.mjs";

export const CAPABILITIES_STREAM = "CAPABILITIES";
export const CAPABILITIES_CONSUMER = "documents-capabilities-projection";

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureCapabilitiesConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: CAPABILITIES_CONSUMER,
    filter_subject: AccountCapabilitiesUpdatedSubject,
    max_ack_pending: 1,
  };

  try {
    await nats.jsm.consumers.info(CAPABILITIES_STREAM, CAPABILITIES_CONSUMER);
  } catch (err) {
    if (
      !(
        err instanceof JetStreamApiError &&
        err.code === JetStreamApiCodes.ConsumerNotFound
      )
    ) {
      throw err;
    }

    await nats.jsm.consumers.add(CAPABILITIES_STREAM, config);
  }
}

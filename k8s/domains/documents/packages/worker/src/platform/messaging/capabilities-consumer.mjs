import {
  AckPolicy,
  DeliverPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
  ReplayPolicy,
} from "@nats-io/jetstream";

import { AccountCapabilitiesUpdatedSubject } from "../../events/capabilities.mjs";
import { CAPABILITIES_STREAM } from "./capabilities-stream.mjs";

export const CAPABILITIES_CONSUMER = "documents-capabilities-projection";

/**
 * @param {import("../runtime.mjs").WorkerRuntime} runtime
 */
export async function ensureCapabilitiesConsumer(runtime) {
  const createConfig = {
    ack_policy: AckPolicy.Explicit,
    deliver_policy: DeliverPolicy.All,
    durable_name: CAPABILITIES_CONSUMER,
    filter_subject: AccountCapabilitiesUpdatedSubject,
    max_ack_pending: 1,
    replay_policy: ReplayPolicy.Instant,
  };

  const updateConfig = {
    filter_subject: createConfig.filter_subject,
    max_ack_pending: createConfig.max_ack_pending,
  };

  try {
    await runtime.messaging.jsm.consumers.info(
      CAPABILITIES_STREAM,
      CAPABILITIES_CONSUMER,
    );
    await runtime.messaging.jsm.consumers.update(
      CAPABILITIES_STREAM,
      CAPABILITIES_CONSUMER,
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

    await runtime.messaging.jsm.consumers.add(
      CAPABILITIES_STREAM,
      createConfig,
    );
  }
}

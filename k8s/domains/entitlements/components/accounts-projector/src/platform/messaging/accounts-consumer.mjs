import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";
import {
  AckPolicy,
  jetstream,
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
} from "@nats-io/jetstream";
import { setTimeout } from "node:timers/promises";

export const ACCOUNTS_STREAM = "ACCOUNTS";
export const ACCOUNTS_CONSUMER = "entitlements-accounts-projection";

const HANDLED_ACCOUNT_EVENT_TYPES = [AccountOpenedV1Type];

/**
 * @param {{ nc: import("@nats-io/transport-node").NatsConnection }} args
 * @param {AbortSignal} signal
 */
export async function getAccountsConsumer({ nc }, signal) {
  const js = jetstream(nc);
  const jsm = await jetstreamManager(nc);

  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ACCOUNTS_CONSUMER,
    filter_subjects: HANDLED_ACCOUNT_EVENT_TYPES,
  };

  while (true) {
    signal.throwIfAborted();

    try {
      await jsm.consumers.add(ACCOUNTS_STREAM, config);
      return await js.consumers.get(ACCOUNTS_STREAM, ACCOUNTS_CONSUMER);
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

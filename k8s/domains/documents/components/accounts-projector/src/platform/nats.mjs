import {
  AckPolicy,
  jetstream,
  JetStreamApiCodes,
  JetStreamApiError,
  jetstreamManager,
} from "@nats-io/jetstream";
import { setTimeout } from "node:timers/promises";

export const ACCOUNTS_STREAM = "ACCOUNTS";
export const ACCOUNTS_CONSUMER = "documents-accounts-projection";

/**
 * @param {{
 *   nc: import("@nats-io/transport-node").NatsConnection,
 *   signal: AbortSignal,
 *   subjects: string[],
 * }} args
 */
export async function getConsumer({ nc, signal, subjects }) {
  const js = jetstream(nc);
  const jsm = await jetstreamManager(nc);

  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ACCOUNTS_CONSUMER,
    filter_subjects: subjects,
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

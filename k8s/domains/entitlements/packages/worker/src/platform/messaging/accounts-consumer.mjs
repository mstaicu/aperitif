import {
  AckPolicy,
  JetStreamApiCodes,
  JetStreamApiError,
} from "@nats-io/jetstream";
import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";

export const ACCOUNTS_STREAM = "ACCOUNTS";
export const ACCOUNTS_CONSUMER = "entitlements-accounts-projection";

const HANDLED_ACCOUNT_EVENT_TYPES = [AccountOpenedV1Type];

/**
 * @param {{ nats: import("../nats.mjs").NatsClient }} args
 */
export async function ensureAccountsConsumer({ nats }) {
  const config = {
    ack_policy: AckPolicy.Explicit,
    durable_name: ACCOUNTS_CONSUMER,
    filter_subjects: HANDLED_ACCOUNT_EVENT_TYPES,
  };

  try {
    const existing = await nats.jsm.consumers.info(
      ACCOUNTS_STREAM,
      ACCOUNTS_CONSUMER,
    );
    const existingFilterSubjects =
      existing.config.filter_subjects ??
      (existing.config.filter_subject ? [existing.config.filter_subject] : []);

    if (
      existing.config.ack_policy !== config.ack_policy ||
      existingFilterSubjects.join("\n") !==
        HANDLED_ACCOUNT_EVENT_TYPES.join("\n")
    ) {
      await nats.jsm.consumers.delete(ACCOUNTS_STREAM, ACCOUNTS_CONSUMER);
      await nats.jsm.consumers.add(ACCOUNTS_STREAM, config);
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

    await nats.jsm.consumers.add(ACCOUNTS_STREAM, config);
  }
}

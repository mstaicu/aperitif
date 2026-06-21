import { addAbortListener } from "node:events";

import {
  AccountMemberUpdatedPayloadCheck,
  AccountMemberUpdatedSchemaVersion,
  AccountMemberUpdatedSubject,
  AccountsEventEnvelopeCheck,
} from "../events/accounts.mjs";
import {
  ACCOUNTS_CONSUMER,
  ACCOUNTS_STREAM,
} from "../platform/messaging/accounts-consumer.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nats: import("../platform/nats.mjs").NatsClient,
 * }} resources
 * @param {AbortSignal} signal
 */
export async function runProjectAccounts({ db, nats }, signal) {
  signal.throwIfAborted();

  const consumer = await nats.js.consumers.get(
    ACCOUNTS_STREAM,
    ACCOUNTS_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });
  const stopOnAbort = addAbortListener(signal, () => messages.stop());

  try {
    for await (const message of messages) {
      signal.throwIfAborted();

      let event;

      try {
        event = message.json();

        if (
          !AccountsEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn(
            JSON.stringify({
              event: "invalid_accounts_event_ignored",
              level: "warn",
              service: "entitlements-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        if (
          event.schema_version === AccountMemberUpdatedSchemaVersion &&
          event.subject === AccountMemberUpdatedSubject
        ) {
          if (!AccountMemberUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid accounts account member updated payload");
          }

          await projectV1AccountMemberUpdated({ db }, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported accounts event");
      } catch (err) {
        console.error(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            event: "accounts_projection_failed",
            event_id: event?.id,
            event_subject: event?.subject ?? message.subject,
            level: "error",
            service: "entitlements-worker",
            version: event?.version,
          }),
        );
        message.nak();
        throw err;
      }
    }
  } finally {
    stopOnAbort[Symbol.dispose]();
    messages.stop();
  }
}

/**
 * @param {{ db: import("pg").Pool }} resources
 * @param {import("../events/accounts.mjs").AccountsEventEnvelope} event
 */
async function projectV1AccountMemberUpdated({ db }, event) {
  const payload =
    /** @type {import("../events/accounts.mjs").AccountMemberUpdatedPayload} */ (
      event.payload
    );
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO projected_accounts (
          account_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (account_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE projected_accounts.version <= EXCLUDED.version
      `,
      [payload.account.id, event.version],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          account_id: payload.account.id,
          event: "account_projection_updated",
          level: "info",
          service: "entitlements-worker",
          version: event.version,
        }),
      );
    }
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

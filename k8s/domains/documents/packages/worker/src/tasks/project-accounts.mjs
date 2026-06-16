import { addAbortListener } from "node:events";

import {
  AccountMemberUpdatedPayloadCheck,
  AccountMemberUpdatedSubject,
  ACCOUNTS_EVENT_SCHEMA_VERSION,
  AccountsEventEnvelopeCheck,
} from "../events/accounts.mjs";
import {
  ACCOUNTS_CONSUMER,
  ACCOUNTS_STREAM,
} from "../platform/messaging/accounts-consumer.mjs";

/**
 * @param {import("../platform/runtime.mjs").WorkerRuntime} runtime
 * @param {AbortSignal} signal
 */
export async function runProjectAccounts(runtime, signal) {
  signal.throwIfAborted();

  const consumer = await runtime.messaging.js.consumers.get(
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
              service: "documents-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        if (
          event.schema_version === ACCOUNTS_EVENT_SCHEMA_VERSION &&
          event.subject === AccountMemberUpdatedSubject
        ) {
          if (!AccountMemberUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid accounts account member updated payload");
          }

          await projectV1AccountMemberUpdated(runtime, event);

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
            service: "documents-worker",
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
 * @param {import("../platform/runtime.mjs").WorkerRuntime} runtime
 * @param {import("../events/accounts.mjs").AccountsEventEnvelope} event
 */
async function projectV1AccountMemberUpdated(runtime, event) {
  const payload =
    /** @type {import("../events/accounts.mjs").AccountMemberUpdatedPayload} */ (
      event.payload
    );

  if (payload.member.account_id !== payload.account.id) {
    throw new Error("Invalid accounts member account id");
  }

  const client = await runtime.db.connect();

  try {
    await client.query("BEGIN");

    const permissions = Object.fromEntries(
      payload.permissions.map((permission) => [
        permission.id,
        permission.value,
      ]),
    );

    const result = await client.query(
      `
        INSERT INTO projected_account_members (
          account_id,
          user_id,
          active,
          permissions,
          version
        )
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (account_id, user_id) DO UPDATE
        SET active = EXCLUDED.active,
          permissions = EXCLUDED.permissions,
          version = EXCLUDED.version
        WHERE projected_account_members.version <= EXCLUDED.version
      `,
      [
        payload.member.account_id,
        payload.member.user_id,
        payload.member.active,
        JSON.stringify(permissions),
        event.version,
      ],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          account_id: payload.member.account_id,
          active: payload.member.active,
          event: "account_member_projection_updated",
          level: "info",
          permission_count: payload.permissions.length,
          role_id: payload.member.role_id,
          service: "documents-worker",
          user_id: payload.member.user_id,
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

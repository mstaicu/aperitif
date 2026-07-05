import { addAbortListener } from "node:events";

import {
  ACCOUNTS_CONSUMER,
  ACCOUNTS_STREAM,
} from "../platform/messaging/accounts-consumer.mjs";

const AccountOpenedSchemaVersion = 1;
const AccountOpenedSubject = "accounts.account.opened";

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
          !event ||
          typeof event !== "object" ||
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

        if (event.subject === AccountOpenedSubject) {
          if (event.schema_version !== AccountOpenedSchemaVersion) {
            throw new Error(
              "Unsupported accounts account opened schema version",
            );
          }

          await projectV1AccountOpened({ db }, event);

          message.ack();
          continue;
        }

        message.ack();
        continue;
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
 * @param {{ db: import("pg").Pool }} resources
 * @param {{
 *   payload: {
 *     account: { id: string },
 *     member: { role: string, user_id: string },
 *   },
 *   version: number,
 * }} event
 */
async function projectV1AccountOpened({ db }, event) {
  const { payload } = event;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO projected_account_members (
          account_id,
          user_id,
          role,
          version
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (account_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
          version = EXCLUDED.version
        WHERE projected_account_members.version <= EXCLUDED.version
      `,
      [
        payload.account.id,
        payload.member.user_id,
        payload.member.role,
        event.version,
      ],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          account_id: payload.account.id,
          event: "account_member_projection_updated",
          level: "info",
          role: payload.member.role,
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

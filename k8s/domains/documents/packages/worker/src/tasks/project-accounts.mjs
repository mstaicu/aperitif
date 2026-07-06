import { addAbortListener } from "node:events";

import {
  AccountOpenedEventCheck,
  AccountOpenedType,
} from "@mstaicu/accounts-contracts";

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
          !event ||
          typeof event !== "object" ||
          event.type !== message.subject
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

        if (event.type === AccountOpenedType) {
          if (!AccountOpenedEventCheck.Check(event)) {
            console.warn(
              JSON.stringify({
                event: "invalid_account_opened_event_ignored",
                level: "warn",
                service: "documents-worker",
                type: event.type,
              }),
            );
            message.ack();
            continue;
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
            event_type: event?.type ?? message.subject,
            level: "error",
            service: "documents-worker",
            version: event?.data?.version,
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
 *   data: {
 *     account: { id: string },
 *     member: { role: string, user_id: string },
 *     version: number,
 *   },
 * }} event
 */
async function projectV1AccountOpened({ db }, event) {
  const { data } = event;

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
        data.account.id,
        data.member.user_id,
        data.member.role,
        data.version,
      ],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          account_id: data.account.id,
          event: "account_member_projection_updated",
          level: "info",
          role: data.member.role,
          service: "documents-worker",
          user_id: data.member.user_id,
          version: data.version,
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

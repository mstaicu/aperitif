import {
  AccountOpenedV1EventCheck,
  AccountOpenedV1Type,
} from "@mstaicu/accounts-contracts";
import { addAbortListener } from "node:events";

import { getAccountsConsumer } from "../platform/messaging/accounts-consumer.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nc: import("../platform/nats.mjs").NatsConnection,
 * }} resources
 * @param {AbortSignal} signal
 */
export function runProjectAccounts({ db, nc }, signal) {
  return getAccountsConsumer({ nc }, signal).then((consumer) =>
    projectAccounts({ consumer, db }, signal),
  );
}

/**
 * @param {{
 *   consumer: import("@nats-io/jetstream").Consumer,
 *   db: import("pg").Pool,
 * }} resources
 * @param {AbortSignal} signal
 */
async function projectAccounts({ consumer, db }, signal) {
  signal.throwIfAborted();

  const messages = await consumer.consume({ max_messages: 1 });

  try {
    // eslint-disable-next-line
    using stopOnAbort = addAbortListener(signal, () => messages.stop());

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

        switch (event.type) {
          case AccountOpenedV1Type:
            if (!AccountOpenedV1EventCheck.Check(event)) {
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

          default:
            message.ack();
            continue;
        }
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
    messages.stop();
  }
}

/**
 * @param {{ db: import("pg").Pool }} resources
 * @param {{
 *   data: {
 *     account: { id: string, type: "personal" | "business" },
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
      [data.account.id, data.member.user_id, data.member.role, data.version],
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

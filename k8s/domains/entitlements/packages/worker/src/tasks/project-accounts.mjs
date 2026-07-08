import {
  AccountOpenedV1EventCheck,
  AccountOpenedV1Type,
} from "@mstaicu/accounts-contracts";
import { addAbortListener } from "node:events";

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
              service: "entitlements-worker",
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
                  service: "entitlements-worker",
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
            service: "entitlements-worker",
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
 *     account: { id: string, type: "personal" | "business" },
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
        INSERT INTO projected_accounts (
          account_id,
          type,
          version
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id) DO UPDATE
        SET type = EXCLUDED.type,
          version = EXCLUDED.version
        WHERE projected_accounts.version <= EXCLUDED.version
      `,
      [data.account.id, data.account.type, data.version],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          account_id: data.account.id,
          event: "account_projection_updated",
          level: "info",
          service: "entitlements-worker",
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

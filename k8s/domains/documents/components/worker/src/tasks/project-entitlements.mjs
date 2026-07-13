import {
  AccountEntitlementsUpdatedV1EventCheck,
  AccountEntitlementsUpdatedV1Type,
} from "@mstaicu/entitlements-contracts";
import { addAbortListener } from "node:events";

import { getEntitlementsConsumer } from "../platform/messaging/entitlements-consumer.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nc: import("../platform/nats.mjs").NatsConnection,
 * }} resources
 * @param {AbortSignal} signal
 */
export function runProjectEntitlements({ db, nc }, signal) {
  return getEntitlementsConsumer({ nc }, signal).then((consumer) =>
    projectEntitlements({ consumer, db }, signal),
  );
}

/**
 * @param {{
 *   consumer: import("@nats-io/jetstream").Consumer,
 *   db: import("pg").Pool,
 * }} resources
 * @param {AbortSignal} signal
 */
async function projectEntitlements({ consumer, db }, signal) {
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
              event: "invalid_entitlements_event_ignored",
              level: "warn",
              service: "documents-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        switch (event.type) {
          case AccountEntitlementsUpdatedV1Type:
            if (!AccountEntitlementsUpdatedV1EventCheck.Check(event)) {
              console.warn(
                JSON.stringify({
                  event: "invalid_account_entitlements_updated_event_ignored",
                  level: "warn",
                  service: "documents-worker",
                  type: event.type,
                }),
              );
              message.ack();
              continue;
            }

            await projectV1AccountEntitlementsUpdated({ db }, event);

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
            event: "entitlements_projection_failed",
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
 *     account: { id: string },
 *     entitlements: Array<{ id: string, value: boolean | number }>,
 *     version: number,
 *   },
 * }} event
 */
async function projectV1AccountEntitlementsUpdated({ db }, event) {
  const { data } = event;
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const entitlements = Object.fromEntries(
      data.entitlements.map((entitlement) => [
        entitlement.id,
        entitlement.value,
      ]),
    );

    const { rowCount } = await client.query(
      `
        INSERT INTO projected_account_entitlements (
          account_id,
          entitlements,
          version
        )
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (account_id) DO UPDATE
        SET entitlements = EXCLUDED.entitlements,
          version = EXCLUDED.version
        WHERE projected_account_entitlements.version <= EXCLUDED.version
      `,
      [data.account.id, JSON.stringify(entitlements), data.version],
    );

    await client.query("COMMIT");

    if (rowCount && rowCount > 0) {
      console.log(
        JSON.stringify({
          account_id: data.account.id,
          entitlement_count: data.entitlements.length,
          event: "account_entitlements_projection_updated",
          level: "info",
          service: "documents-worker",
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

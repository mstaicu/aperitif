import { addAbortListener } from "node:events";

import {
  AccountEntitlementsUpdatedPayloadCheck,
  AccountEntitlementsUpdatedSubject,
  ENTITLEMENTS_EVENT_SCHEMA_VERSION,
  EntitlementsEventEnvelopeCheck,
} from "../events/entitlements.mjs";
import {
  ENTITLEMENTS_CONSUMER,
  ENTITLEMENTS_STREAM,
} from "../platform/messaging/entitlements-consumer.mjs";

/**
 * @param {{
 *   db: import("pg").Pool,
 *   nats: import("../platform/nats.mjs").NatsClient,
 * }} resources
 * @param {AbortSignal} signal
 */
export async function runProjectEntitlements({ db, nats }, signal) {
  signal.throwIfAborted();

  const consumer = await nats.js.consumers.get(
    ENTITLEMENTS_STREAM,
    ENTITLEMENTS_CONSUMER,
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
          !EntitlementsEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
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

        if (
          event.schema_version === ENTITLEMENTS_EVENT_SCHEMA_VERSION &&
          event.subject === AccountEntitlementsUpdatedSubject
        ) {
          if (!AccountEntitlementsUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error(
              "Invalid entitlements account entitlements updated payload",
            );
          }

          await projectV1AccountEntitlementsUpdated({ db }, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported entitlements event");
      } catch (err) {
        console.error(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            event: "entitlements_projection_failed",
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
 * @param {import("../events/entitlements.mjs").EntitlementsEventEnvelope} event
 */
async function projectV1AccountEntitlementsUpdated({ db }, event) {
  const payload =
    /** @type {import("../events/entitlements.mjs").AccountEntitlementsUpdatedPayload} */ (
      event.payload
    );
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const entitlements = Object.fromEntries(
      payload.entitlements.map((entitlement) => [
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
      [payload.account.id, JSON.stringify(entitlements), event.version],
    );

    await client.query("COMMIT");

    if (rowCount && rowCount > 0) {
      console.log(
        JSON.stringify({
          account_id: payload.account.id,
          entitlement_count: payload.entitlements.length,
          event: "account_entitlements_projection_updated",
          level: "info",
          service: "documents-worker",
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

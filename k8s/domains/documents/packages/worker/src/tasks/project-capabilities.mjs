import { addAbortListener } from "node:events";

import {
  AccountCapabilitiesUpdatedPayloadCheck,
  AccountCapabilitiesUpdatedSubject,
  CAPABILITIES_EVENT_SCHEMA_VERSION,
  CapabilitiesEventEnvelopeCheck,
} from "../events/capabilities.mjs";
import { CAPABILITIES_CONSUMER } from "../platform/messaging/capabilities-consumer.mjs";
import { CAPABILITIES_STREAM } from "../platform/messaging/capabilities-stream.mjs";

/**
 * @param {import("../platform/runtime.mjs").WorkerRuntime} runtime
 * @param {AbortSignal} signal
 */
export async function runProjectCapabilities(runtime, signal) {
  signal.throwIfAborted();

  const consumer = await runtime.messaging.js.consumers.get(
    CAPABILITIES_STREAM,
    CAPABILITIES_CONSUMER,
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
          !CapabilitiesEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn(
            JSON.stringify({
              event: "invalid_capabilities_event_ignored",
              level: "warn",
              service: "documents-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        if (
          event.schema_version === CAPABILITIES_EVENT_SCHEMA_VERSION &&
          event.subject === AccountCapabilitiesUpdatedSubject
        ) {
          if (!AccountCapabilitiesUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error(
              "Invalid capabilities account capabilities updated payload",
            );
          }

          await projectV1AccountCapabilitiesUpdated(runtime, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported capabilities event");
      } catch (err) {
        console.error(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            event: "capabilities_projection_failed",
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
 * @param {import("../events/capabilities.mjs").CapabilitiesEventEnvelope} event
 */
async function projectV1AccountCapabilitiesUpdated(runtime, event) {
  const payload =
    /** @type {import("../events/capabilities.mjs").AccountCapabilitiesUpdatedPayload} */ (
      event.payload
    );
  const client = await runtime.db.connect();

  try {
    await client.query("BEGIN");

    const capabilities = Object.fromEntries(
      payload.capabilities.map((capability) => [
        capability.id,
        capability.value,
      ]),
    );

    const { rowCount } = await client.query(
      `
        INSERT INTO projected_account_capabilities (
          account_id,
          capabilities,
          version
        )
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (account_id) DO UPDATE
        SET capabilities = EXCLUDED.capabilities,
          version = EXCLUDED.version
        WHERE projected_account_capabilities.version <= EXCLUDED.version
      `,
      [payload.account.id, JSON.stringify(capabilities), event.version],
    );

    await client.query("COMMIT");

    if (rowCount && rowCount > 0) {
      console.log(
        JSON.stringify({
          account_id: payload.account.id,
          capability_count: payload.capabilities.length,
          event: "account_capabilities_projection_updated",
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

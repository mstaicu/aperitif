import { addAbortListener } from "node:events";

import {
  CAPABILITIES_EVENT_SCHEMA_VERSION,
  CapabilitiesEventEnvelopeCheck,
  TenantCapabilitiesUpdatedPayloadCheck,
  TenantCapabilitiesUpdatedSubject,
} from "../events/capabilities/index.mjs";
import { CAPABILITIES_CONSUMER } from "../platform/messaging/capabilities-consumer.mjs";
import { CAPABILITIES_STREAM } from "../platform/messaging/capabilities-stream.mjs";

const PROJECTED_SUBJECTS = new Set([TenantCapabilitiesUpdatedSubject]);

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runProjectCapabilities(ctx, signal) {
  signal.throwIfAborted();

  const consumer = await ctx.messaging.js.consumers.get(
    CAPABILITIES_STREAM,
    CAPABILITIES_CONSUMER,
  );
  const messages = await consumer.consume({ max_messages: 1 });
  const stopOnAbort = addAbortListener(signal, () => messages.stop());

  try {
    for await (const message of messages) {
      signal.throwIfAborted();

      try {
        if (!PROJECTED_SUBJECTS.has(message.subject)) {
          message.ack();
          continue;
        }

        const event = message.json();

        if (
          !CapabilitiesEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn("ignoring invalid capabilities event envelope", {
            subject: message.subject,
          });
          message.ack();
          continue;
        }

        if (
          event.schema_version === CAPABILITIES_EVENT_SCHEMA_VERSION &&
          event.subject === TenantCapabilitiesUpdatedSubject
        ) {
          if (!TenantCapabilitiesUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error(
              "Invalid capabilities tenant capabilities updated payload",
            );
          }

          await projectV1TenantCapabilitiesUpdated(ctx, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported capabilities event");
      } catch (err) {
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/capabilities/index.mjs").CapabilitiesEventEnvelope} event
 */
async function projectV1TenantCapabilitiesUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/capabilities/index.mjs").TenantCapabilitiesUpdatedPayload} */ (
      event.payload
    );
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO projected_tenant_capabilities (
          tenant_id,
          capabilities,
          version
        )
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (tenant_id) DO UPDATE
        SET capabilities = EXCLUDED.capabilities,
          version = EXCLUDED.version
        WHERE projected_tenant_capabilities.version < EXCLUDED.version
      `,
      [payload.tenant.id, JSON.stringify(payload.capabilities), event.version],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

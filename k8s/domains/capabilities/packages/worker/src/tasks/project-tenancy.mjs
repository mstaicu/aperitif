import { addAbortListener } from "node:events";

import {
  TenancyEventEnvelopeCheck,
  TenantMemberUpdatedPayloadCheck,
  TenantMemberUpdatedSchemaVersion,
  TenantMemberUpdatedSubject,
} from "../events/tenancy.mjs";
import { TENANCY_CONSUMER } from "../platform/messaging/tenancy-consumer.mjs";
import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {AbortSignal} signal
 */
export async function runProjectTenancy(ctx, signal) {
  signal.throwIfAborted();

  const consumer = await ctx.messaging.js.consumers.get(
    TENANCY_STREAM,
    TENANCY_CONSUMER,
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
          !TenancyEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn(
            JSON.stringify({
              event: "invalid_tenancy_event_ignored",
              level: "warn",
              service: "capabilities-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        if (
          event.schema_version === TenantMemberUpdatedSchemaVersion &&
          event.subject === TenantMemberUpdatedSubject
        ) {
          if (!TenantMemberUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid tenancy tenant member updated payload");
          }

          await projectV1TenantMemberUpdated(ctx, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported tenancy event");
      } catch (err) {
        console.error(
          JSON.stringify({
            error: err instanceof Error ? err.message : String(err),
            event: "tenancy_projection_failed",
            event_id: event?.id,
            event_subject: event?.subject ?? message.subject,
            level: "error",
            service: "capabilities-worker",
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/tenancy.mjs").TenancyEventEnvelope} event
 */
async function projectV1TenantMemberUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/tenancy.mjs").TenantMemberUpdatedPayload} */ (
      event.payload
    );
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        INSERT INTO projected_tenants (
          tenant_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE projected_tenants.version <= EXCLUDED.version
      `,
      [payload.tenant.id, event.version],
    );

    await client.query("COMMIT");

    if ((result.rowCount ?? 0) > 0) {
      console.log(
        JSON.stringify({
          event: "tenant_projection_updated",
          level: "info",
          service: "capabilities-worker",
          tenant_id: payload.tenant.id,
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

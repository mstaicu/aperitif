import { addAbortListener } from "node:events";

import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenancyEventEnvelopeCheck,
  TenantMemberUpdatedPayloadCheck,
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
              service: "documents-worker",
              subject: message.subject,
            }),
          );
          message.ack();
          continue;
        }

        if (
          event.schema_version === TENANCY_EVENT_SCHEMA_VERSION &&
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
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/tenancy.mjs").TenancyEventEnvelope} event
 */
async function projectV1TenantMemberUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/tenancy.mjs").TenantMemberUpdatedPayload} */ (
      event.payload
    );

  if (payload.member.tenant_id !== payload.tenant.id) {
    throw new Error("Invalid tenancy member tenant id");
  }

  const client = await ctx.persistence.db.connect();

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
        INSERT INTO projected_tenant_members (
          tenant_id,
          user_id,
          active,
          permissions,
          version
        )
        VALUES ($1, $2, $3, $4::jsonb, $5)
        ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET active = EXCLUDED.active,
          permissions = EXCLUDED.permissions,
          version = EXCLUDED.version
        WHERE projected_tenant_members.version <= EXCLUDED.version
      `,
      [
        payload.member.tenant_id,
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
          active: payload.member.active,
          event: "tenant_member_projection_updated",
          level: "info",
          permission_count: payload.permissions.length,
          role_id: payload.member.role_id,
          service: "documents-worker",
          tenant_id: payload.member.tenant_id,
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

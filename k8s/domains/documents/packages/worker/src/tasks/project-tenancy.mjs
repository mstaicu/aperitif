import { addAbortListener } from "node:events";

import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenancyEventEnvelopeCheck,
  TenantMembershipUpdatedPayloadCheck,
  TenantMembershipUpdatedSubject,
  TenantUpdatedPayloadCheck,
  TenantUpdatedSubject,
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

      try {
        const event = message.json();

        if (
          !TenancyEventEnvelopeCheck.Check(event) ||
          event.subject !== message.subject
        ) {
          console.warn("ignoring invalid tenancy event envelope", {
            subject: message.subject,
          });
          message.ack();
          continue;
        }

        if (
          event.schema_version === TENANCY_EVENT_SCHEMA_VERSION &&
          event.subject === TenantUpdatedSubject
        ) {
          if (!TenantUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid tenancy tenant updated payload");
          }

          await projectV1TenantUpdated(ctx, event);

          message.ack();
          continue;
        }

        if (
          event.schema_version === TENANCY_EVENT_SCHEMA_VERSION &&
          event.subject === TenantMembershipUpdatedSubject
        ) {
          if (!TenantMembershipUpdatedPayloadCheck.Check(event.payload)) {
            throw new Error("Invalid tenancy membership updated payload");
          }

          await projectV1TenantMembershipUpdated(ctx, event);

          message.ack();
          continue;
        }

        throw new Error("Unsupported tenancy event");
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
 * @param {import("../events/tenancy.mjs").TenancyEventEnvelope} event
 */
async function projectV1TenantMembershipUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/tenancy.mjs").TenantMembershipUpdatedPayload} */ (
      event.payload
    );

  if (payload.membership.tenant_id !== payload.tenant.id) {
    throw new Error("Invalid tenancy membership tenant id");
  }

  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO projected_tenants (
          tenant_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE projected_tenants.version < EXCLUDED.version
      `,
      [payload.tenant.id, event.version],
    );

    await client.query(
      `
        INSERT INTO projected_tenant_memberships (
          tenant_id,
          user_id,
          role,
          version
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id, user_id) DO UPDATE
        SET role = EXCLUDED.role,
          version = EXCLUDED.version
        WHERE projected_tenant_memberships.version < EXCLUDED.version
      `,
      [
        payload.membership.tenant_id,
        payload.membership.user_id,
        payload.membership.role,
        event.version,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/tenancy.mjs").TenancyEventEnvelope} event
 */
async function projectV1TenantUpdated(ctx, event) {
  const payload =
    /** @type {import("../events/tenancy.mjs").TenantUpdatedPayload} */ (
      event.payload
    );
  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO projected_tenants (
          tenant_id,
          version
        )
        VALUES ($1, $2)
        ON CONFLICT (tenant_id) DO UPDATE
        SET version = EXCLUDED.version
        WHERE projected_tenants.version < EXCLUDED.version
      `,
      [payload.tenant.id, event.version],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

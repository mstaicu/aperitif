import { addAbortListener } from "node:events";

import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenancyEventEnvelopeCheck,
  TenantMembershipUpdatedPayloadCheck,
  TenantMembershipUpdatedSubject,
  TenantUpdatedPayloadCheck,
  TenantUpdatedSubject,
  WorkspaceUpdatedPayloadCheck,
  WorkspaceUpdatedSubject,
} from "../events/tenancy/index.mjs";
import { TENANCY_CONSUMER } from "../platform/messaging/tenancy-consumer.mjs";
import { TENANCY_STREAM } from "../platform/messaging/tenancy-stream.mjs";

const PROJECTED_SUBJECTS = new Set([
  TenantMembershipUpdatedSubject,
  TenantUpdatedSubject,
  WorkspaceUpdatedSubject,
]);

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
        await handleTenancyEvent(ctx, message);
        message.ack();
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
 * @param {import("@nats-io/jetstream").JsMsg} message
 */
async function handleTenancyEvent(ctx, message) {
  if (!PROJECTED_SUBJECTS.has(message.subject)) {
    return;
  }

  const event = message.json();

  if (
    !TenancyEventEnvelopeCheck.Check(event) ||
    event.subject !== message.subject
  ) {
    console.warn("ignoring invalid tenancy event envelope", {
      subject: message.subject,
    });
    return;
  }

  if (event.schema_version !== TENANCY_EVENT_SCHEMA_VERSION) {
    throw new Error("Unsupported tenancy event schema version");
  }

  await projectTenancyEvent(ctx, event);
}

/**
 * @param {import("../platform/context.mjs").WorkerContext} ctx
 * @param {import("../events/tenancy/index.mjs").TenancyEventEnvelope} event
 */
async function projectTenancyEvent(ctx, event) {
  let tenant;
  let membership = null;
  let workspace = null;

  if (event.subject === TenantUpdatedSubject) {
    if (!TenantUpdatedPayloadCheck.Check(event.payload)) {
      throw new Error("Invalid tenancy tenant updated payload");
    }

    tenant = event.payload.tenant;
  } else if (event.subject === TenantMembershipUpdatedSubject) {
    if (!TenantMembershipUpdatedPayloadCheck.Check(event.payload)) {
      throw new Error("Invalid tenancy membership updated payload");
    }

    if (event.payload.membership.tenant_id !== event.payload.tenant.id) {
      throw new Error("Invalid tenancy membership tenant id");
    }

    tenant = event.payload.tenant;
    membership = {
      role: event.payload.membership.role,
      status: event.payload.membership.status,
      tenant_id: event.payload.membership.tenant_id,
      user_id: event.payload.membership.user_id,
    };
  } else if (event.subject === WorkspaceUpdatedSubject) {
    if (!WorkspaceUpdatedPayloadCheck.Check(event.payload)) {
      throw new Error("Invalid tenancy workspace updated payload");
    }

    if (event.payload.workspace.tenant_id !== event.payload.tenant.id) {
      throw new Error("Invalid tenancy workspace tenant id");
    }

    tenant = event.payload.tenant;
    workspace = event.payload.workspace;
  } else {
    return;
  }

  const client = await ctx.persistence.db.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO tenant_projection (
          tenant_id,
          status,
          version
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id) DO UPDATE
        SET status = EXCLUDED.status,
          version = EXCLUDED.version
        WHERE tenant_projection.version < EXCLUDED.version
      `,
      [tenant.id, tenant.status, event.version],
    );

    if (membership) {
      await client.query(
        `
          INSERT INTO tenant_membership_projection (
            tenant_id,
            user_id,
            role,
            status,
            version
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tenant_id, user_id) DO UPDATE
          SET role = EXCLUDED.role,
            status = EXCLUDED.status,
            version = EXCLUDED.version
          WHERE tenant_membership_projection.version < EXCLUDED.version
        `,
        [
          membership.tenant_id,
          membership.user_id,
          membership.role,
          membership.status,
          event.version,
        ],
      );
    }

    if (workspace) {
      await client.query(
        `
          INSERT INTO workspace_projection (
            workspace_id,
            tenant_id,
            status,
            version
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (workspace_id) DO UPDATE
          SET tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            version = EXCLUDED.version
          WHERE workspace_projection.version < EXCLUDED.version
        `,
        [workspace.id, workspace.tenant_id, workspace.status, event.version],
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});

    throw err;
  } finally {
    client.release();
  }
}

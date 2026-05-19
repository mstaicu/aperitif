import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenantCreatedPayloadCheck,
  TenantCreatedSubject,
  TenantMembershipCreatedPayloadCheck,
  TenantMembershipCreatedSubject,
  TenantMembershipDeletedPayloadCheck,
  TenantMembershipDeletedSubject,
  WorkspaceCreatedPayloadCheck,
  WorkspaceCreatedSubject,
} from "../../../events/tenancy/index.mjs";

const PROJECTED_SUBJECTS = new Set([
  TenantCreatedSubject,
  TenantMembershipCreatedSubject,
  TenantMembershipDeletedSubject,
  WorkspaceCreatedSubject,
]);

/**
 * @param {import("../../../platform/context.mjs").WorkerContext} ctx
 * @param {import("../../../events/tenancy/index.mjs").TenancyEventEnvelope} event
 */
export async function handleTenancyProjectionV1Event(ctx, event) {
  if (!isTenancyProjectionV1Subject(event.subject)) {
    return;
  }

  if (event.schema_version !== TENANCY_EVENT_SCHEMA_VERSION) {
    throw new Error("Unsupported tenancy projection v1 event schema version");
  }

  let tenant;
  let membership = null;
  let workspace = null;

  if (event.subject === TenantCreatedSubject) {
    if (!TenantCreatedPayloadCheck.Check(event.payload)) {
      console.warn("ignoring invalid tenancy tenant created payload", {
        subject: event.subject,
      });
      return;
    }

    tenant = event.payload.tenant;
  } else if (event.subject === TenantMembershipCreatedSubject) {
    if (!TenantMembershipCreatedPayloadCheck.Check(event.payload)) {
      console.warn("ignoring invalid tenancy membership created payload", {
        subject: event.subject,
      });
      return;
    }

    if (event.payload.membership.tenant_id !== event.payload.tenant.id) {
      console.warn("ignoring invalid tenancy membership tenant id", {
        subject: event.subject,
      });
      return;
    }

    tenant = event.payload.tenant;
    membership = {
      role: event.payload.membership.role,
      status: "active",
      tenant_id: event.payload.membership.tenant_id,
      user_id: event.payload.membership.user_id,
    };
  } else if (event.subject === TenantMembershipDeletedSubject) {
    if (!TenantMembershipDeletedPayloadCheck.Check(event.payload)) {
      console.warn("ignoring invalid tenancy membership deleted payload", {
        subject: event.subject,
      });
      return;
    }

    if (event.payload.membership.tenant_id !== event.payload.tenant.id) {
      console.warn("ignoring invalid tenancy membership tenant id", {
        subject: event.subject,
      });
      return;
    }

    tenant = event.payload.tenant;
    membership = {
      role: null,
      status: "deleted",
      tenant_id: event.payload.membership.tenant_id,
      user_id: event.payload.membership.user_id,
    };
  } else if (event.subject === WorkspaceCreatedSubject) {
    if (!WorkspaceCreatedPayloadCheck.Check(event.payload)) {
      console.warn("ignoring invalid tenancy workspace created payload", {
        subject: event.subject,
      });
      return;
    }

    if (event.payload.workspace.tenant_id !== event.payload.tenant.id) {
      console.warn("ignoring invalid tenancy workspace tenant id", {
        subject: event.subject,
      });
      return;
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
          tenant_version
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id) DO UPDATE
        SET status = EXCLUDED.status,
          tenant_version = EXCLUDED.tenant_version
        WHERE tenant_projection.tenant_version < EXCLUDED.tenant_version
      `,
      [tenant.id, tenant.status, event.tenant_version],
    );

    if (membership) {
      await client.query(
        `
          INSERT INTO tenant_membership_projection (
            tenant_id,
            user_id,
            role,
            status,
            tenant_version
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tenant_id, user_id) DO UPDATE
          SET role = EXCLUDED.role,
            status = EXCLUDED.status,
            tenant_version = EXCLUDED.tenant_version
          WHERE tenant_membership_projection.tenant_version < EXCLUDED.tenant_version
        `,
        [
          membership.tenant_id,
          membership.user_id,
          membership.role,
          membership.status,
          event.tenant_version,
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
            tenant_version
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (workspace_id) DO UPDATE
          SET tenant_id = EXCLUDED.tenant_id,
            status = EXCLUDED.status,
            tenant_version = EXCLUDED.tenant_version
          WHERE workspace_projection.tenant_version < EXCLUDED.tenant_version
        `,
        [
          workspace.id,
          workspace.tenant_id,
          workspace.status,
          event.tenant_version,
        ],
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

/**
 * @param {string} subject
 */
export function isTenancyProjectionV1Subject(subject) {
  return PROJECTED_SUBJECTS.has(subject);
}

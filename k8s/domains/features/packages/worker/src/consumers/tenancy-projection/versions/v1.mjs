import {
  TENANCY_EVENT_SCHEMA_VERSION,
  TenantCreatedPayloadCheck,
  TenantCreatedSubject,
  TenantMembershipCreatedPayloadCheck,
  TenantMembershipCreatedSubject,
  TenantMembershipDeletedPayloadCheck,
  TenantMembershipDeletedSubject,
} from "../../../events/index.mjs";

const PROJECTED_SUBJECTS = new Set([
  TenantCreatedSubject,
  TenantMembershipCreatedSubject,
  TenantMembershipDeletedSubject,
]);

/**
 * @param {import("../../../platform/context.mjs").WorkerContext} ctx
 * @param {import("../../../events/index.mjs").TenancyEventEnvelope} event
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

  if (event.subject === TenantCreatedSubject) {
    if (!TenantCreatedPayloadCheck.Check(event.payload)) {
      throw new Error("Invalid tenancy tenant created payload");
    }

    tenant = event.payload.tenant;
  } else if (event.subject === TenantMembershipCreatedSubject) {
    if (!TenantMembershipCreatedPayloadCheck.Check(event.payload)) {
      throw new Error("Invalid tenancy membership created payload");
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
      throw new Error("Invalid tenancy membership deleted payload");
    }

    tenant = event.payload.tenant;
    membership = {
      role: null,
      status: "deleted",
      tenant_id: event.payload.membership.tenant_id,
      user_id: event.payload.membership.user_id,
    };
  } else {
    return;
  }

  const client = await ctx.persistence.db.connect();

  let brokenClient = false;

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO tenant_projection (
          tenant_id,
          kind,
          status,
          tenant_version
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id) DO UPDATE
        SET kind = EXCLUDED.kind,
          status = EXCLUDED.status,
          tenant_version = EXCLUDED.tenant_version,
          projected_at = now()
        WHERE tenant_projection.tenant_version < EXCLUDED.tenant_version
      `,
      [tenant.id, tenant.kind, tenant.status, event.tenant_version],
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
            tenant_version = EXCLUDED.tenant_version,
            projected_at = now()
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

    await client.query("COMMIT");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      brokenClient = true;
    }

    throw err;
  } finally {
    client.release(brokenClient);
  }
}

/**
 * @param {string} subject
 */
export function isTenancyProjectionV1Subject(subject) {
  return PROJECTED_SUBJECTS.has(subject);
}

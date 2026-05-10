import {
  TenantCreatedPayloadCheck,
  TenantCreatedSchemaVersion,
  TenantCreatedSubject,
  TenantMembershipCreatedPayloadCheck,
  TenantMembershipCreatedSchemaVersion,
  TenantMembershipCreatedSubject,
  WorkspaceCreatedPayloadCheck,
  WorkspaceCreatedSchemaVersion,
  WorkspaceCreatedSubject,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, kind: "personal" | "organization", name: string }) => Promise<{
 *   tenant: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "active" | "archived",
 *   },
 *   workspace: {
 *     id: string,
 *     name: string,
 *     status: "active" | "archived",
 *     tenant_id: string,
 *   },
 * }>}
 */
export const createTenant =
  (ctx) =>
  async ({ currentUserId, kind, name }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          INSERT INTO tenants (name, kind, status)
          VALUES ($1, $2, $3)
          RETURNING id, name, kind, status, version
        `,
        [name, kind, "active"],
      );

      await client.query(
        `
          INSERT INTO tenant_memberships (tenant_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [tenant.id, currentUserId],
      );

      const workspaceResult = await client.query(
        `
          INSERT INTO workspaces (
            tenant_id,
            name
          )
          VALUES ($1, $2)
          RETURNING id, tenant_id, name, status
        `,
        [tenant.id, name],
      );
      const workspace = workspaceResult.rows[0];

      /** @type {import("../../events/index.mjs").TenantCreatedPayload} */
      const tenantCreatedPayload = {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          status: tenant.status,
        },
      };

      if (!TenantCreatedPayloadCheck.Check(tenantCreatedPayload)) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          TenantCreatedSubject,
          tenant.version,
          TenantCreatedSchemaVersion,
          JSON.stringify(tenantCreatedPayload),
        ],
      );

      const {
        rows: [{ version: membershipTenantVersion }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenant.id],
      );

      /** @type {import("../../events/index.mjs").TenantMembershipCreatedPayload} */
      const membershipCreatedPayload = {
        membership: {
          role: "owner",
          tenant_id: tenant.id,
          user_id: currentUserId,
        },
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          status: tenant.status,
        },
      };

      if (
        !TenantMembershipCreatedPayloadCheck.Check(membershipCreatedPayload)
      ) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          TenantMembershipCreatedSubject,
          membershipTenantVersion,
          TenantMembershipCreatedSchemaVersion,
          JSON.stringify(membershipCreatedPayload),
        ],
      );

      const {
        rows: [{ version: workspaceTenantVersion }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenant.id],
      );

      /** @type {import("../../events/index.mjs").WorkspaceCreatedPayload} */
      const workspaceCreatedPayload = {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          status: tenant.status,
        },
        workspace: {
          id: workspace.id,
          status: workspace.status,
          tenant_id: workspace.tenant_id,
        },
      };

      if (!WorkspaceCreatedPayloadCheck.Check(workspaceCreatedPayload)) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          WorkspaceCreatedSubject,
          workspaceTenantVersion,
          WorkspaceCreatedSchemaVersion,
          JSON.stringify(workspaceCreatedPayload),
        ],
      );

      await client.query("COMMIT");

      return {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          status: workspace.status,
          tenant_id: workspace.tenant_id,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

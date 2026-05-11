import { buildWorkspaceCreatedEvent } from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, name: string, tenantId: string }) => Promise<{
 *   workspace: {
 *     id: string,
 *     name: string,
 *     status: "active" | "archived",
 *     tenant_id: string,
 *   },
 * }>}
 */
export const createTenantWorkspace =
  (ctx) =>
  async ({ currentUserId, name, tenantId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT id,
            type,
            status
          FROM tenants
          WHERE id = $1
          FOR UPDATE
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT role
          FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenantId, currentUserId],
      );

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [workspace],
      } = await client.query(
        `
          INSERT INTO workspaces (
            tenant_id,
            name
          )
          VALUES ($1, $2)
          RETURNING id,
            tenant_id,
            name,
            status
        `,
        [tenantId, name],
      );

      const {
        rows: [{ version }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenantId],
      );

      const workspaceCreatedEvent = buildWorkspaceCreatedEvent({
        tenant: {
          id: tenant.id,
          status: tenant.status,
          type: tenant.type,
        },
        workspace: {
          id: workspace.id,
          status: workspace.status,
          tenant_id: workspace.tenant_id,
        },
      });

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
          workspaceCreatedEvent.subject,
          version,
          workspaceCreatedEvent.schema_version,
          JSON.stringify(workspaceCreatedEvent.payload),
        ],
      );

      await client.query("COMMIT");

      return {
        workspace,
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

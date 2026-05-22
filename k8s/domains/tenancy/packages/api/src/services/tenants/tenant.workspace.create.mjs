import { DatabaseError } from "pg";

import { buildWorkspaceUpdatedEvent } from "../../events/index.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, name: string, tenantId: string }) => Promise<{
 *   workspace: {
 *     id: string,
 *     name: string,
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
          SELECT id
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
            name
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

      const workspaceUpdatedEvent = buildWorkspaceUpdatedEvent(
        {
          tenant: {
            id: tenant.id,
          },
          workspace: {
            id: workspace.id,
            tenant_id: workspace.tenant_id,
          },
        },
        Number(version),
      );

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event
          )
          VALUES ($1, $2::jsonb)
        `,
        [workspaceUpdatedEvent.id, JSON.stringify(workspaceUpdatedEvent)],
      );

      await client.query("COMMIT");

      return {
        workspace,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError) {
        if (
          err.code?.startsWith("08") ||
          err.code === "53300" ||
          err.code === "57P01" ||
          err.code === "57P02" ||
          err.code === "57P03" ||
          err.code === "57014"
        ) {
          throw new Error("DATABASE_UNAVAILABLE", { cause: err });
        }
      }

      throw err;
    } finally {
      client?.release();
    }
  };

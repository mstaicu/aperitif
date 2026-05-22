import { DatabaseError } from "pg";

const REQUIRED_CAPABILITY_ID = "documents.enabled";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   currentUserId: string,
 *   title: string,
 *   workspaceId: string,
 * }) => Promise<{
 *   created_by: string,
 *   id: string,
 *   tenant_id: string,
 *   title: string,
 *   workspace_id: string,
 * }>}
 */
export const createDocument =
  (ctx) =>
  async ({ currentUserId, title, workspaceId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [workspace],
      } = await client.query(
        `
          SELECT w.tenant_id
          FROM projected_workspaces w
          JOIN projected_tenants t ON t.tenant_id = w.tenant_id
          WHERE w.workspace_id = $1
        `,
        [workspaceId],
      );

      if (!workspace) {
        throw new Error("WORKSPACE_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT 1
          FROM projected_tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [workspace.tenant_id, currentUserId],
      );

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [capabilityProjection],
      } =
        /** @type {{ rows: { capabilities?: { id?: unknown, value?: unknown }[] }[] }} */ (
          await client.query(
            `
              SELECT capabilities
              FROM projected_tenant_capabilities
              WHERE tenant_id = $1
            `,
            [workspace.tenant_id],
          )
        );

      const hasRequiredCapability =
        Array.isArray(capabilityProjection?.capabilities) &&
        capabilityProjection.capabilities.some(
          (capability) =>
            capability?.id === REQUIRED_CAPABILITY_ID &&
            capability?.value === true,
        );

      if (!hasRequiredCapability) {
        throw new Error("CAPABILITY_REQUIRED");
      }

      const {
        rows: [document],
      } = await client.query(
        `
          INSERT INTO documents (
            tenant_id,
            workspace_id,
            title,
            created_by
          )
          VALUES ($1, $2, $3, $4)
          RETURNING
            created_by,
            id,
            tenant_id,
            title,
            workspace_id
        `,
        [workspace.tenant_id, workspaceId, title, currentUserId],
      );

      await client.query("COMMIT");

      return document;
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

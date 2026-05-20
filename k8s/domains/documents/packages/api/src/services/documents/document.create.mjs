import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

const REQUIRED_FEATURE_CODE = "documents.enabled";

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
          FROM workspace_projection w
          JOIN tenant_projection t ON t.tenant_id = w.tenant_id
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
          FROM tenant_membership_projection
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [workspace.tenant_id, currentUserId],
      );

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [feature],
      } = await client.query(
        `
          SELECT value
          FROM tenant_feature_projection
          WHERE tenant_id = $1
            AND feature_code = $2
        `,
        [workspace.tenant_id, REQUIRED_FEATURE_CODE],
      );

      if (feature?.value !== true) {
        throw new Error("FEATURE_REQUIRED");
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

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

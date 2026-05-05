import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { tenantId: string, currentUserId: string }) => Promise<{
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed",
 *     type: string,
 *   }[],
 * }>}
 */
export const listTenantRequirements =
  (ctx) =>
  async ({ currentUserId, tenantId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT id
          FROM tenants
          WHERE id = $1
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

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT id, type, status
          FROM tenant_requirements
          WHERE tenant_id = $1
          ORDER BY type
        `,
        [tenantId],
      );

      return {
        requirements: rows.map((requirement) => ({
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
        })),
      };
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

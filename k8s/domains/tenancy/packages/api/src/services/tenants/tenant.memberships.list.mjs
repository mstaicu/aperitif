import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { tenantId: string, currentUserId: string }) => Promise<{
 *   memberships: {
 *     tenant_id: string,
 *     role: "owner" | "member",
 *     user_id: string,
 *   }[],
 * }>}
 */
export const listTenantMemberships =
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
        rows: [currentMembership],
      } = await client.query(
        `
          SELECT role
          FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenantId, currentUserId],
      );

      if (!currentMembership || currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT user_id, role
          FROM tenant_memberships
          WHERE tenant_id = $1
          ORDER BY user_id
        `,
        [tenantId],
      );

      return {
        memberships: rows.map((row) => ({
          role: row.role,
          tenant_id: tenantId,
          user_id: row.user_id,
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

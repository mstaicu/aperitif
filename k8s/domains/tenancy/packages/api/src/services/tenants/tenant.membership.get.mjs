import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { tenantId: string, currentUserId: string, userId: string }) => Promise<{
 *   membership: {
 *     tenant_id: string,
 *     role: "owner" | "member",
 *     user_id: string,
 *   },
 * }>}
 */
export const getTenantMembership =
  (ctx) =>
  async ({ currentUserId, tenantId, userId }) => {
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

      if (!currentMembership) {
        throw new Error("FORBIDDEN");
      }

      if (currentUserId !== userId && currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
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
        [tenantId, userId],
      );

      if (!membership) {
        throw new Error("TENANT_MEMBERSHIP_NOT_FOUND");
      }

      return {
        membership: {
          role: membership.role,
          tenant_id: tenantId,
          user_id: userId,
        },
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

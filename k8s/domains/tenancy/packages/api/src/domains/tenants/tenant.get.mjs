import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { tenantId: string, currentUserId: string }) => Promise<{
 *   tenant: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "active" | "archived",
 *   },
 * }>}
 */
export const getTenant =
  (ctx) =>
  async ({ currentUserId, tenantId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT id, name, kind, status
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

      return {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
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

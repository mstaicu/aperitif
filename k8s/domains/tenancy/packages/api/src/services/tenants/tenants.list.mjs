import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   tenants: {
 *     id: string,
 *     name: string,
 *     status: "active" | "archived",
 *     type: "personal" | "organization",
 *   }[],
 * }>}
 */
export const listTenants =
  (ctx) =>
  async ({ currentUserId }) => {
    let rows;

    try {
      ({ rows } = await ctx.persistence.db.query(
        `
          SELECT t.id, t.name, t.type, t.status
          FROM tenant_memberships tm
          JOIN tenants t ON t.id = tm.tenant_id
          WHERE tm.user_id = $1
          ORDER BY t.name, t.id
        `,
        [currentUserId],
      ));
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }

    return {
      tenants: rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        type: row.type,
      })),
    };
  };

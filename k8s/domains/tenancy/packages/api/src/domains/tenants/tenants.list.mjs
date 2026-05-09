import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   tenants: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "active" | "archived",
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
          SELECT a.id, a.name, a.kind, a.status
          FROM tenant_memberships am
          JOIN tenants a ON a.id = am.tenant_id
          WHERE am.user_id = $1
          ORDER BY a.name, a.id
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
        kind: row.kind,
        name: row.name,
        status: row.status,
      })),
    };
  };

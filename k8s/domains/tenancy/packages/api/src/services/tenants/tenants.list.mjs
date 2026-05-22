import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   tenants: {
 *     id: string,
 *     name: string,
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
          SELECT t.id, t.name
          FROM tenant_memberships tm
          JOIN tenants t ON t.id = tm.tenant_id
          WHERE tm.user_id = $1
          ORDER BY t.name, t.id
        `,
        [currentUserId],
      ));
    } catch (err) {
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
    }

    return {
      tenants: rows.map((row) => ({
        id: row.id,
        name: row.name,
      })),
    };
  };

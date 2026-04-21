import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   count: number,
 *   spaces: {
 *     membership: {
 *       role: string,
 *       space_id: string,
 *       user_id: string,
 *     },
 *     space: {
 *       id: string,
 *     },
 *   }[],
 * }>}
 */
export const list =
  (ctx) =>
  async ({ currentUserId }) => {
    let rows;

    try {
      ({ rows } = await ctx.persistence.db.query(
        `
          SELECT space_id, role
          FROM space_memberships
          WHERE user_id = $1
          ORDER BY space_id
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
      count: rows.length,
      spaces: rows.map((row) => ({
        membership: {
          role: row.role,
          space_id: row.space_id,
          user_id: currentUserId,
        },
        space: {
          id: row.space_id,
        },
      })),
    };
  };

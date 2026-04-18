/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{ spaces: { id: string, role: string }[] }>}
 */
export const list =
  (ctx) =>
  async ({ currentUserId }) => {
    const { rows } = await ctx.data.db.query(
      `
        SELECT space_id AS id, role
        FROM space_memberships
        WHERE user_id = $1
        ORDER BY space_id
      `,
      [currentUserId],
    );

    return {
      spaces: rows,
    };
  };

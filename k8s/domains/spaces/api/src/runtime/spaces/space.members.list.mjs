/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<{ members: { user_id: string, role: string }[] }>}
 */
export const listMembers =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    const client = await ctx.persistence.db.connect();

    try {
      const {
        rows: [space],
      } = await client.query(
        `
          SELECT id
          FROM spaces
          WHERE id = $1
        `,
        [spaceId],
      );

      if (!space) {
        throw new Error("SPACE_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT role
          FROM space_memberships
          WHERE space_id = $1
            AND user_id = $2
        `,
        [spaceId, currentUserId],
      );

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT user_id, role
          FROM space_memberships
          WHERE space_id = $1
          ORDER BY user_id
        `,
        [spaceId],
      );

      return {
        members: rows,
      };
    } finally {
      client.release();
    }
  };

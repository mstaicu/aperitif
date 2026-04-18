/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<{ membership: { role: string }, space: { id: string } }>}
 */
export const get =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    const client = await ctx.data.db.connect();

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

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      return {
        membership: {
          role: membership.role,
        },
        space: {
          id: spaceId,
        },
      };
    } finally {
      client.release();
    }
  };

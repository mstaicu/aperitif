/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<void>}
 */
export const leave =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    const client = await ctx.data.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT role
          FROM space_memberships
          WHERE space_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [spaceId, currentUserId],
      );

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      if (membership.role === "owner") {
        const { rows: owners } = await client.query(
          `
            SELECT user_id
            FROM space_memberships
            WHERE space_id = $1
              AND role = 'owner'
            FOR UPDATE
          `,
          [spaceId],
        );

        if (owners.length <= 1) {
          throw new Error("LAST_OWNER");
        }
      }

      await client.query(
        `
          DELETE FROM space_memberships
          WHERE space_id = $1
            AND user_id = $2
        `,
        [spaceId, currentUserId],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, role: string, spaceId: string, userId: string }) => Promise<{ membership: { role: string, space_id: string, user_id: string } }>}
 */
export const createMember =
  (ctx) =>
  async ({ currentUserId, role, spaceId, userId }) => {
    const {
      rows: [space],
    } = await ctx.data.db.query(
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
    } = await ctx.data.db.query(
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

    const client = await ctx.data.db.connect();

    try {
      await client.query("BEGIN");

      try {
        await client.query(
          `
            INSERT INTO space_memberships (space_id, user_id, role)
            VALUES ($1, $2, $3)
          `,
          [spaceId, userId, role],
        );
      } catch (err) {
        const error = /** @type {{ code?: string }} */ (err);

        if (error.code === "23505") {
          throw new Error("MEMBERSHIP_ALREADY_EXISTS");
        }

        throw err;
      }

      await client.query("COMMIT");

      return {
        membership: {
          role,
          space_id: spaceId,
          user_id: userId,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

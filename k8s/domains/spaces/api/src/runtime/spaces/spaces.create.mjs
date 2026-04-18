/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{ membership: { role: string }, space: { id: string } }>}
 */
export const create =
  (ctx) =>
  async ({ currentUserId }) => {
    const client = await ctx.data.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [space],
      } = await client.query(
        `
          INSERT INTO spaces DEFAULT VALUES
          RETURNING id
        `,
      );

      await client.query(
        `
          INSERT INTO space_memberships (space_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [space.id, currentUserId],
      );

      await client.query("COMMIT");

      return {
        membership: {
          role: "owner",
        },
        space: {
          id: space.id,
        },
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

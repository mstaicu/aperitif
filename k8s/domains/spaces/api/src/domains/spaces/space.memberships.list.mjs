import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<{
 *   count: number,
 *   memberships: {
 *     role: string,
 *     space_id: string,
 *     user_id: string,
 *   }[],
 *   space: {
 *     id: string,
 *   },
 * }>}
 */
export const listMemberships =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
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
        count: rows.length,
        memberships: rows.map((row) => ({
          role: row.role,
          space_id: spaceId,
          user_id: row.user_id,
        })),
        space: {
          id: spaceId,
        },
      };
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

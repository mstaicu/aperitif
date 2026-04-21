import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<{
 *   membership: {
 *     role: string,
 *     space_id: string,
 *     user_id: string,
 *   },
 *   space: {
 *     id: string,
 *   },
 * }>}
 */
export const get =
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

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      return {
        membership: {
          role: membership.role,
          space_id: spaceId,
          user_id: currentUserId,
        },
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

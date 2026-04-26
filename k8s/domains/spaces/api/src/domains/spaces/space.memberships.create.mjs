import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, role: string, spaceId: string, userId: string }) => Promise<{
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
export const createMembership =
  (ctx) =>
  async ({ currentUserId, role, spaceId, userId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

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
          FOR UPDATE
        `,
        [spaceId, currentUserId],
      );

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [existingMembership],
      } = await client.query(
        `
          SELECT role
          FROM space_memberships
          WHERE space_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [spaceId, userId],
      );

      if (existingMembership) {
        if (existingMembership.role !== role) {
          throw new Error("MEMBERSHIP_ALREADY_EXISTS");
        }

        await client.query("COMMIT");

        return {
          membership: {
            role: existingMembership.role,
            space_id: spaceId,
            user_id: userId,
          },
          space: {
            id: spaceId,
          },
        };
      }

      // TODO: This assumes userId is a valid global identity UUID.
      // When an identity projection exists locally, validate it here.
      await client.query(
        `
          INSERT INTO space_memberships (space_id, user_id, role)
          VALUES ($1, $2, $3)
        `,
        [spaceId, userId, role],
      );

      // TODO: When eventing is wired, insert an outbox row in this transaction for:
      // - spaces.membership.created

      await client.query("COMMIT");

      return {
        membership: {
          role,
          space_id: spaceId,
          user_id: userId,
        },
        space: {
          id: spaceId,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

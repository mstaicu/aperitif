import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string, userId: string }) => Promise<void>}
 */
export const deleteMember =
  (ctx) =>
  async ({ currentUserId, spaceId, userId }) => {
    if (userId === currentUserId) {
      throw new Error("FORBIDDEN_SELF_TARGET");
    }

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
        rows: [currentMembership],
      } = await client.query(
        `
          SELECT role
          FROM space_memberships
          WHERE space_id = $1
            AND user_id = $2
        `,
        [spaceId, currentUserId],
      );

      if (!currentMembership || currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [targetMembership],
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

      if (!targetMembership) {
        await client.query("COMMIT");
        return;
      }

      if (targetMembership.role === "owner") {
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
        [spaceId, userId],
      );

      // TODO: When eventing is wired, insert an outbox row in this transaction for:
      // - spaces.membership.deleted
      // Use targetMembership.role together with spaceId and userId.

      await client.query("COMMIT");
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

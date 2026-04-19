/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<void>}
 */
export const destroy =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    const client = await ctx.data.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [space],
      } = await client.query(
        `
          SELECT id
          FROM spaces
          WHERE id = $1
          FOR UPDATE
        `,
        [spaceId],
      );

      if (!space) {
        throw new Error("SPACE_NOT_FOUND");
      }

      const { rows: memberships } = await client.query(
        `
          SELECT space_id, role
          FROM space_memberships
          WHERE user_id = $1
          FOR UPDATE
        `,
        [currentUserId],
      );

      const targetMembership = memberships.find(
        (membership) => membership.space_id === spaceId,
      );

      if (!targetMembership || targetMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const hasAnotherSpace = memberships.some(
        (membership) => membership.space_id !== spaceId,
      );

      if (!hasAnotherSpace) {
        throw new Error("ANOTHER_SPACE_REQUIRED");
      }

      const {
        rows: [openAdmission],
      } = await client.query(
        `
          SELECT id
          FROM space_admissions
          WHERE space_id = $1
            AND status = 'open'
          LIMIT 1
          FOR UPDATE
        `,
        [spaceId],
      );

      if (openAdmission) {
        throw new Error("OPEN_ADMISSIONS_PRESENT");
      }

      await client.query(
        `
          DELETE FROM spaces
          WHERE id = $1
        `,
        [spaceId],
      );

      // TODO: When eventing is wired, insert outbox rows in this transaction for:
      // - spaces.space.deleted
      // - spaces.membership.deleted

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

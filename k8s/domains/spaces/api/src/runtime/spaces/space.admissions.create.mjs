/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, requested_role: string, spaceId: string }) => Promise<{ admission: { id: string, requested_role: string, space_id: string, status: "open", user_id: null }, requirements: { requirement: string, status: "pending" }[] }>}
 */
export const createAdmission =
  (ctx) =>
  async ({ currentUserId, requested_role, spaceId }) => {
    // Add or remove business steps here. Owning domains should publish
    // status updates for these requirement names; spaces only tracks status.
    const requirements = ["profile", "terms"];
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
        rows: [admission],
      } = await client.query(
        `
          INSERT INTO space_admissions (space_id, user_id, requested_role, status)
          VALUES ($1, NULL, $2, 'open')
          RETURNING id, space_id, user_id, requested_role, status
        `,
        [spaceId, requested_role],
      );

      if (requirements.length > 0) {
        await client.query(
          `
            INSERT INTO space_admission_requirements (admission_id, requirement, status)
            SELECT $1, unnest($2::text[]), 'pending'
          `,
          [admission.id, requirements],
        );
      }

      await client.query("COMMIT");

      return {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: "open",
          user_id: admission.user_id,
        },
        requirements: requirements.map((requirement) => ({
          requirement,
          status: "pending",
        })),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

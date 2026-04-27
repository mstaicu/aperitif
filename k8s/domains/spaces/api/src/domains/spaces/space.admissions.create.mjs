import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, requested_role: string, spaceId: string }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string,
 *     status: "open",
 *     user_id: null,
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending",
 *     type: string,
 *   }[],
 * }>}
 */
export const createAdmission =
  (ctx) =>
  async ({ currentUserId, requested_role, spaceId }) => {
    // Add or remove business steps here. Owning domains should publish
    // status updates for these requirement names; spaces only tracks status.
    const admissionRequirements = ["profile", "terms"];
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [space],
      } = await client.query(
        `
          SELECT s.id, a.status AS account_status
          FROM spaces s
          JOIN accounts a ON a.id = s.account_id
          WHERE s.id = $1
        `,
        [spaceId],
      );

      if (!space) {
        throw new Error("SPACE_NOT_FOUND");
      }

      if (space.account_status !== "active") {
        throw new Error("ACCOUNT_NOT_ACTIVE");
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

      /** @type {{ id: string, status: "pending", type: string }[]} */
      let requirementRows = [];

      if (admissionRequirements.length > 0) {
        const { rows } = await client.query(
          `
            INSERT INTO space_admission_requirements (admission_id, type, status)
            SELECT $1, unnest($2::text[]), 'pending'
            RETURNING id, type, status
          `,
          [admission.id, admissionRequirements],
        );

        requirementRows = rows;
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
        requirements: requirementRows.map((requirement) => ({
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
        })),
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

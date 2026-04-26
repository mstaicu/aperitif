import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

// Add or remove business steps here. Owning domains should publish
// status updates for these requirement names; spaces only tracks status.

const requirements = ["profile"];

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string | null,
 *     status: "open" | "completed",
 *     user_id: string,
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending",
 *     type: string,
 *   }[],
 * }>}
 */
export const create =
  (ctx) =>
  async ({ currentUserId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      await client.query("BEGIN");

      const {
        rows: [admission],
      } = await client.query(
        `
          INSERT INTO space_admissions (space_id, user_id, requested_role, status)
          VALUES (NULL, $1, 'owner', 'open')
          RETURNING id, space_id, user_id, requested_role, status
        `,
        [currentUserId],
      );

      /** @type {{ id: string, status: "pending", type: string }[]} */
      let requirementRows = [];

      if (requirements.length > 0) {
        const { rows } = await client.query(
          `
            INSERT INTO space_admission_requirements (admission_id, type, status)
            SELECT $1, unnest($2::text[]), 'pending'
            RETURNING id, type, status
          `,
          [admission.id, requirements],
        );

        requirementRows = rows;
      }

      let finalizedAdmission = admission;

      if (requirements.length === 0) {
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
            VALUES ($1, $2, $3)
          `,
          [space.id, currentUserId, admission.requested_role],
        );

        ({
          rows: [finalizedAdmission],
        } = await client.query(
          `
            UPDATE space_admissions
            SET space_id = $2,
                status = 'completed'
            WHERE id = $1
            RETURNING id, space_id, user_id, requested_role, status
          `,
          [admission.id, space.id],
        ));
      }

      await client.query("COMMIT");

      return {
        admission: {
          id: finalizedAdmission.id,
          requested_role: finalizedAdmission.requested_role,
          space_id: finalizedAdmission.space_id,
          status: finalizedAdmission.status,
          user_id: finalizedAdmission.user_id,
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

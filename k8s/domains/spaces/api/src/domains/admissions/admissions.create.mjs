import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

// Add or remove business steps here. Owning domains should publish
// status updates for these requirement names; spaces only tracks status.

const requirements = ["profile"];

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string | null }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string | null,
 *     status: "open" | "completed",
 *     user_id: string | null,
 *   },
 *   requirements: {
 *     requirement: string,
 *     status: "pending",
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

      if (requirements.length > 0) {
        await client.query(
          `
            INSERT INTO space_admission_requirements (admission_id, requirement, status)
            SELECT $1, unnest($2::text[]), 'pending'
          `,
          [admission.id, requirements],
        );
      }

      let finalizedAdmission = admission;

      if (requirements.length === 0 && currentUserId) {
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
        requirements: requirements.map((requirement) => ({
          requirement,
          status: "pending",
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

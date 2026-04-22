import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string | null,
 *     status: "open" | "completed" | "failed" | "cancelled" | "expired",
 *     user_id: string | null,
 *   },
 *   requirements: {
 *     requirement: string,
 *     status: "pending" | "completed" | "failed",
 *   }[],
 * }>}
 */
export const claim =
  (ctx) =>
  async ({ admissionId, currentUserId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [existingAdmission],
      } = await client.query(
        `
          SELECT id, space_id, user_id, requested_role, status
          FROM space_admissions
          WHERE id = $1
          FOR UPDATE
        `,
        [admissionId],
      );

      if (!existingAdmission) {
        throw new Error("ADMISSION_NOT_FOUND");
      }

      if (
        existingAdmission.status !== "open" &&
        !(
          existingAdmission.status === "completed" &&
          existingAdmission.user_id === currentUserId
        )
      ) {
        throw new Error("ADMISSION_NOT_OPEN");
      }

      let admission = existingAdmission;

      if (admission.user_id && admission.user_id !== currentUserId) {
        throw new Error("ADMISSION_CLAIMED");
      }

      if (!admission.user_id) {
        const {
          rows: [claimedAdmission],
        } = await client.query(
          `
            UPDATE space_admissions
            SET user_id = $2
            WHERE id = $1
            RETURNING id, space_id, user_id, requested_role, status
          `,
          [admissionId, currentUserId],
        );

        admission = claimedAdmission;
      }

      const { rows: requirements } = await client.query(
        `
          SELECT requirement, status
          FROM space_admission_requirements
          WHERE admission_id = $1
          ORDER BY requirement
        `,
        [admission.id],
      );

      if (admission.status === "open" && requirements.length === 0) {
        if (admission.space_id) {
          await client.query(
            `
              INSERT INTO space_memberships (space_id, user_id, role)
              VALUES ($1, $2, $3)
            `,
            [admission.space_id, currentUserId, admission.requested_role],
          );

          ({
            rows: [admission],
          } = await client.query(
            `
              UPDATE space_admissions
              SET status = 'completed'
              WHERE id = $1
              RETURNING id, space_id, user_id, requested_role, status
            `,
            [admission.id],
          ));
        } else {
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
            rows: [admission],
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
      }

      const response = {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: admission.status,
          user_id: admission.user_id,
        },
        requirements: requirements.map((requirement) => ({
          requirement: requirement.requirement,
          status: requirement.status,
        })),
      };

      // TODO: When the worker is added, write an outbox row in this transaction for:
      // - spaces.admission.claimed

      await client.query("COMMIT");

      return response;
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

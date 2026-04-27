import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string,
 *     status: "open" | "completed" | "failed" | "cancelled" | "expired",
 *     user_id: string | null,
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed" | "failed",
 *     type: string,
 *   }[],
 * }>}
 */
export const claimAdmission =
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

      if (existingAdmission.status !== "open") {
        throw new Error("ADMISSION_NOT_OPEN");
      }

      let admission = existingAdmission;

      if (admission.user_id) {
        throw new Error("ADMISSION_CLAIMED");
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
        [admission.space_id, currentUserId],
      );

      if (membership) {
        throw new Error("MEMBERSHIP_ALREADY_EXISTS");
      }

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

      const { rows: requirements } = await client.query(
        `
          SELECT id, type, status
          FROM space_admission_requirements
          WHERE admission_id = $1
          ORDER BY type
        `,
        [admission.id],
      );

      if (admission.status === "open" && requirements.length === 0) {
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
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
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

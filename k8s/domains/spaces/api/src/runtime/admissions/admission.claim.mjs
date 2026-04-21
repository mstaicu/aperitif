/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string }) => Promise<any>}
 */
export const claim =
  (ctx) =>
  async ({ admissionId, currentUserId }) => {
    const client = await ctx.persistence.db.connect();

    try {
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

      const response = {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: admission.status,
          user_id: admission.user_id,
        },
      };

      // TODO: When the worker is added, write an outbox row in this transaction for:
      // - spaces.admission.claimed

      await client.query("COMMIT");

      return response;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

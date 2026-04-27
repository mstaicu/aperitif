import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string, type: string }) => Promise<{
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
export const completeAdmissionRequirement =
  (ctx) =>
  async ({ admissionId, currentUserId, type }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      let {
        rows: [admission],
      } = await client.query(
        `
          SELECT id, space_id, user_id, requested_role, status
          FROM space_admissions
          WHERE id = $1
          FOR UPDATE
        `,
        [admissionId],
      );

      if (!admission) {
        throw new Error("ADMISSION_NOT_FOUND");
      }

      if (admission.status !== "open") {
        throw new Error("ADMISSION_NOT_OPEN");
      }

      if (!admission.user_id) {
        throw new Error("ADMISSION_NOT_CLAIMED");
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

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [requirement],
      } = await client.query(
        `
          UPDATE space_admission_requirements
          SET status = 'completed'
          WHERE admission_id = $1
            AND type = $2
          RETURNING id
        `,
        [admissionId, type],
      );

      if (!requirement) {
        throw new Error("ADMISSION_REQUIREMENT_NOT_FOUND");
      }

      const { rows: requirements } = await client.query(
        `
          SELECT id, type, status
          FROM space_admission_requirements
          WHERE admission_id = $1
          ORDER BY type
        `,
        [admissionId],
      );

      const isComplete = requirements.every(
        (requirement) => requirement.status === "completed",
      );

      if (isComplete) {
        await client.query(
          `
            INSERT INTO space_memberships (space_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (space_id, user_id) DO NOTHING
          `,
          [admission.space_id, admission.user_id, admission.requested_role],
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
          [admissionId],
        ));
      }

      await client.query("COMMIT");

      return {
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

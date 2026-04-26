import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string | null }) => Promise<{
 *   admission: {
 *     id: string,
 *     requested_role: string,
 *     space_id: string | null,
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
export const get =
  (ctx) =>
  async ({ admissionId, currentUserId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [admission],
      } = await client.query(
        `
          SELECT id, space_id, user_id, requested_role, status
          FROM space_admissions
          WHERE id = $1
        `,
        [admissionId],
      );

      if (!admission) {
        throw new Error("ADMISSION_NOT_FOUND");
      }

      if (admission.user_id && admission.user_id !== currentUserId) {
        throw new Error("FORBIDDEN");
      }

      if (!admission.user_id && admission.space_id) {
        if (!currentUserId) {
          throw new Error("FORBIDDEN");
        }

        const {
          rows: [membership],
        } = await client.query(
          `
            SELECT role
            FROM space_memberships
            WHERE space_id = $1
              AND user_id = $2
          `,
          [admission.space_id, currentUserId],
        );

        if (!membership || membership.role !== "owner") {
          throw new Error("FORBIDDEN");
        }
      }

      // NOTE: Unclaimed self-started admissions remain capability-style reads
      // for now. Tightening that later will need a separate access token or
      // a different client flow for anonymous onboarding.

      const { rows: requirements } = await client.query(
        `
          SELECT id, type, status
          FROM space_admission_requirements
          WHERE admission_id = $1
          ORDER BY type
        `,
        [admission.id],
      );

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

      return response;
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

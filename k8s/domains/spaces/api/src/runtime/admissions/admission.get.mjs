/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string | null }) => Promise<any>}
 */
export const get =
  (ctx) =>
  async ({ admissionId, currentUserId }) => {
    const client = await ctx.data.db.connect();

    try {
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

      const { rows: requirements } = await client.query(
        `
          SELECT requirement, status
          FROM space_admission_requirements
          WHERE admission_id = $1
          ORDER BY requirement
        `,
        [admission.id],
      );

      if (admission.user_id && admission.user_id !== currentUserId) {
        throw new Error("FORBIDDEN");
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

      if (
        !admission.space_id ||
        !admission.user_id ||
        admission.status !== "completed"
      ) {
        return response;
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
        [admission.space_id, admission.user_id],
      );

      if (!membership) {
        return response;
      }

      return {
        ...response,
        membership: {
          role: membership.role,
        },
        space: {
          id: admission.space_id,
        },
      };
    } finally {
      client.release();
    }
  };

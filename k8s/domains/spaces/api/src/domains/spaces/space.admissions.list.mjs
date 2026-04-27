import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, spaceId: string }) => Promise<{
 *   admissions: {
 *     admission: {
 *       id: string,
 *       requested_role: string,
 *       space_id: string,
 *       status: "open" | "completed" | "failed" | "cancelled" | "expired",
 *       user_id: string | null,
 *     },
 *     requirements: {
 *       id: string,
 *       status: "pending" | "completed" | "failed",
 *       type: string,
 *     }[],
 *   }[],
 *   count: number,
 *   space: {
 *     account_id: string,
 *     id: string,
 *     name: string,
 *   },
 * }>}
 */
export const listAdmissions =
  (ctx) =>
  async ({ currentUserId, spaceId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [space],
      } = await client.query(
        `
          SELECT id, account_id, name
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
        `,
        [spaceId, currentUserId],
      );

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const { rows: admissions } = await client.query(
        `
          SELECT id, space_id, user_id, requested_role, status
          FROM space_admissions
          WHERE space_id = $1
          ORDER BY id
        `,
        [spaceId],
      );

      /** @type {Map<string, { id: string, status: "pending" | "completed" | "failed", type: string }[]>} */
      const requirementsByAdmissionId = new Map(
        admissions.map((admission) => [admission.id, []]),
      );

      if (admissions.length > 0) {
        const { rows: requirements } = await client.query(
          `
            SELECT admission_id, id, type, status
            FROM space_admission_requirements
            WHERE admission_id = ANY($1::uuid[])
            ORDER BY type
          `,
          [admissions.map((admission) => admission.id)],
        );

        for (const requirement of requirements) {
          requirementsByAdmissionId.get(requirement.admission_id)?.push({
            id: requirement.id,
            status: requirement.status,
            type: requirement.type,
          });
        }
      }

      return {
        admissions: admissions.map((admission) => ({
          admission: {
            id: admission.id,
            requested_role: admission.requested_role,
            space_id: admission.space_id,
            status: admission.status,
            user_id: admission.user_id,
          },
          requirements: requirementsByAdmissionId.get(admission.id) ?? [],
        })),
        count: admissions.length,
        space: {
          account_id: space.account_id,
          id: space.id,
          name: space.name,
        },
      };
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

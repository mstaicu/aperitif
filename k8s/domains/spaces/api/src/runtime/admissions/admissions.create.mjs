/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string | null, requested_role: string, requirements?: string[], space_id?: string | null }) => Promise<any>}
 */
export const create =
  (ctx) =>
  async ({ currentUserId, requested_role, requirements = [], space_id = null }) => {
    const dedupedRequirements = Array.from(new Set(requirements));
    const canCompleteImmediately =
      !!currentUserId && dedupedRequirements.length === 0;

    if (space_id) {
      const {
        rows: [space],
      } = await ctx.data.db.query(
        `
          SELECT id
          FROM spaces
          WHERE id = $1
        `,
        [space_id],
      );

      if (!space) {
        throw new Error("SPACE_NOT_FOUND");
      }
    }

    const client = await ctx.data.db.connect();

    try {
      await client.query("BEGIN");

      const {
        rows: [admission],
      } = await client.query(
        `
          INSERT INTO space_admissions (space_id, user_id, requested_role, status)
          VALUES ($1, $2, $3, 'open')
          RETURNING id, space_id, user_id, requested_role, status
        `,
        [space_id, currentUserId, requested_role],
      );

      if (dedupedRequirements.length > 0) {
        await client.query(
          `
            INSERT INTO space_admission_requirements (admission_id, requirement, status)
            SELECT $1, unnest($2::text[]), 'pending'
          `,
          [admission.id, dedupedRequirements],
        );
      }

      /** @type {any} */
      let response = {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: admission.status,
          user_id: admission.user_id,
        },
        requirements: dedupedRequirements.map((requirement) => ({
          requirement,
          status: "pending",
        })),
      };

      if (canCompleteImmediately) {
        let nextSpaceId = admission.space_id;

        if (!nextSpaceId) {
          const {
            rows: [space],
          } = await client.query(
            `
              INSERT INTO spaces DEFAULT VALUES
              RETURNING id
            `,
          );

          nextSpaceId = space.id;
        }

        await client.query(
          `
            INSERT INTO space_memberships (space_id, user_id, role)
            VALUES ($1, $2, $3)
          `,
          [nextSpaceId, admission.user_id, admission.requested_role],
        );

        const {
          rows: [completedAdmission],
        } = await client.query(
          `
            UPDATE space_admissions
            SET
              space_id = $2,
              status = 'completed'
            WHERE id = $1
            RETURNING id, space_id, user_id, requested_role, status
          `,
          [admission.id, nextSpaceId],
        );

        response = {
          ...response,
          admission: {
            id: completedAdmission.id,
            requested_role: completedAdmission.requested_role,
            space_id: completedAdmission.space_id,
            status: completedAdmission.status,
            user_id: completedAdmission.user_id,
          },
          membership: {
            role: admission.requested_role,
          },
          space: {
            id: nextSpaceId,
          },
        };
      }

      await client.query("COMMIT");

      return response;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  };

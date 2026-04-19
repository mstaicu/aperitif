/**
 * @param {import("../../context.mjs").Context} ctx
 * @returns {(args: { admissionId: string, currentUserId: string }) => Promise<any>}
 */
export const claim =
  (ctx) =>
  async ({ admissionId, currentUserId }) => {
    const client = await ctx.data.db.connect();

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

      const canCompleteAdmission =
        admission.status !== "completed" &&
        requirements.every((requirement) => requirement.status === "satisfied");

      /** @type {any} */
      let response = {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: admission.status,
          user_id: admission.user_id,
        },
      };

      if (canCompleteAdmission) {
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
            ON CONFLICT (space_id, user_id) DO NOTHING
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
          admission: {
            id: completedAdmission.id,
            requested_role: completedAdmission.requested_role,
            space_id: completedAdmission.space_id,
            status: completedAdmission.status,
            user_id: completedAdmission.user_id,
          },
          membership: {
            role: completedAdmission.requested_role,
          },
          space: {
            id: nextSpaceId,
          },
        };
      } else if (
        admission.space_id &&
        admission.user_id &&
        admission.status === "completed"
      ) {
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

        if (membership) {
          response = {
            ...response,
            membership: {
              role: membership.role,
            },
            space: {
              id: admission.space_id,
            },
          };
        }
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

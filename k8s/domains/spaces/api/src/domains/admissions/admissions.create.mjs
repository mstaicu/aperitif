import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string | null }) => Promise<{ admission: { id: string, requested_role: string, space_id: null, status: "open", user_id: string | null }, requirements: { requirement: string, status: "pending" }[] }>}
 */
export const create =
  (ctx) =>
  async ({ currentUserId }) => {
    // Add or remove business steps here. Owning domains should publish
    // status updates for these requirement names; spaces only tracks status.
    const requirements = ["profile", "terms"];
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

      await client.query("COMMIT");

      return {
        admission: {
          id: admission.id,
          requested_role: admission.requested_role,
          space_id: admission.space_id,
          status: /** @type {"open"} */ ("open"),
          user_id: admission.user_id,
        },
        requirements: requirements.map((requirement) => ({
          requirement,
          status: /** @type {"pending"} */ ("pending"),
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

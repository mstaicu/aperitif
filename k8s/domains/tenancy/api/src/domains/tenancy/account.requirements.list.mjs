import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string }) => Promise<{
 *   count: number,
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed",
 *     type: string,
 *   }[],
 * }>}
 */
export const listAccountRequirements =
  (ctx) =>
  async ({ accountId, currentUserId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [account],
      } = await client.query(
        `
          SELECT id
          FROM accounts
          WHERE id = $1
        `,
        [accountId],
      );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT role
          FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
        `,
        [accountId, currentUserId],
      );

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT id, type, status
          FROM account_requirements
          WHERE account_id = $1
          ORDER BY type
        `,
        [accountId],
      );

      return {
        count: rows.length,
        requirements: rows.map((requirement) => ({
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
        })),
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

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string }) => Promise<{
 *   count: number,
 *   memberships: {
 *     account_id: string,
 *     role: "owner" | "member",
 *     user_id: string,
 *   }[],
 * }>}
 */
export const listAccountMemberships =
  (ctx) =>
  async ({ accountId, currentUserId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();

      const {
        rows: [account],
      } = await client.query(
        `
          SELECT id, name, kind, status
          FROM accounts
          WHERE id = $1
        `,
        [accountId],
      );

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const {
        rows: [currentMembership],
      } = await client.query(
        `
          SELECT role
          FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
        `,
        [accountId, currentUserId],
      );

      if (!currentMembership || currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT user_id, role
          FROM account_memberships
          WHERE account_id = $1
          ORDER BY user_id
        `,
        [accountId],
      );

      return {
        count: rows.length,
        memberships: rows.map((row) => ({
          account_id: accountId,
          role: row.role,
          user_id: row.user_id,
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

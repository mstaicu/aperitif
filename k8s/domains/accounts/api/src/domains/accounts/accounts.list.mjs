import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string }) => Promise<{
 *   accounts: {
 *     account: {
 *       id: string,
 *       kind: "personal" | "organization",
 *       name: string,
 *       status: "pending" | "active",
 *     },
 *     membership: {
 *       account_id: string,
 *       role: "owner" | "member",
 *       user_id: string,
 *     },
 *   }[],
 *   count: number,
 * }>}
 */
export const listAccounts =
  (ctx) =>
  async ({ currentUserId }) => {
    let rows;

    try {
      ({ rows } = await ctx.persistence.db.query(
        `
          SELECT a.id, a.name, a.kind, a.status, am.role
          FROM account_memberships am
          JOIN accounts a ON a.id = am.account_id
          WHERE am.user_id = $1
          ORDER BY a.name, a.id
        `,
        [currentUserId],
      ));
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }

    return {
      accounts: rows.map((row) => ({
        account: {
          id: row.id,
          kind: row.kind,
          name: row.name,
          status: row.status,
        },
        membership: {
          account_id: row.id,
          role: row.role,
          user_id: currentUserId,
        },
      })),
      count: rows.length,
    };
  };

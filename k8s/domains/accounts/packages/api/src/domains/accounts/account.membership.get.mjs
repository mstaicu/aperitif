import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, userId: string }) => Promise<{
 *   membership: {
 *     account_id: string,
 *     role: "owner" | "member",
 *     user_id: string,
 *   },
 * }>}
 */
export const getAccountMembership =
  (ctx) =>
  async ({ accountId, currentUserId, userId }) => {
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

      if (!currentMembership) {
        throw new Error("FORBIDDEN");
      }

      if (currentUserId !== userId && currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
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
        [accountId, userId],
      );

      if (!membership) {
        throw new Error("ACCOUNT_MEMBERSHIP_NOT_FOUND");
      }

      return {
        membership: {
          account_id: accountId,
          role: membership.role,
          user_id: userId,
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

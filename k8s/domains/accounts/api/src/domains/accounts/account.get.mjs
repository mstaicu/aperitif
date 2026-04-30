import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string }) => Promise<{
 *   account: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "pending" | "active",
 *   },
 *   membership: {
 *     account_id: string,
 *     role: "owner" | "member",
 *     user_id: string,
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed",
 *     type: string,
 *   }[],
 * }>}
 */
export const getAccount =
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

      const { rows: requirements } = await client.query(
        `
          SELECT id, type, status
          FROM account_requirements
          WHERE account_id = $1
          ORDER BY type
        `,
        [accountId],
      );

      return {
        account: {
          id: account.id,
          kind: account.kind,
          name: account.name,
          status: account.status,
        },
        membership: {
          account_id: accountId,
          role: membership.role,
          user_id: currentUserId,
        },
        requirements: requirements.map((requirement) => ({
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

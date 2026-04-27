import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string }) => Promise<{
 *   account: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "pending_activation" | "active" | "suspended" | "closed",
 *   },
 *   count: number,
 *   spaces: {
 *     account_id: string,
 *     id: string,
 *     name: string,
 *   }[],
 * }>}
 */
export const listAccountSpaces =
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
        rows: [accountMembership],
      } = await client.query(
        `
          SELECT role
          FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
        `,
        [accountId, currentUserId],
      );

      if (!accountMembership) {
        throw new Error("FORBIDDEN");
      }

      const { rows } = await client.query(
        `
          SELECT id, account_id, name
          FROM spaces
          WHERE account_id = $1
          ORDER BY name, id
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
        count: rows.length,
        spaces: rows.map((space) => ({
          account_id: space.account_id,
          id: space.id,
          name: space.name,
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

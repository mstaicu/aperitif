import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, name: string }) => Promise<{
 *   membership: {
 *     role: "owner",
 *     space_id: string,
 *     user_id: string,
 *   },
 *   space: {
 *     account_id: string,
 *     id: string,
 *     name: string,
 *   },
 * }>}
 */
export const createAccountSpace =
  (ctx) =>
  async ({ accountId, currentUserId, name }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          SELECT id
          FROM accounts
          WHERE id = $1
          FOR UPDATE
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
          FOR UPDATE
        `,
        [accountId, currentUserId],
      );

      if (!accountMembership || accountMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [space],
      } = await client.query(
        `
          INSERT INTO spaces (account_id, name)
          VALUES ($1, $2)
          RETURNING id, account_id, name
        `,
        [accountId, name],
      );

      await client.query(
        `
          INSERT INTO space_memberships (space_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [space.id, currentUserId],
      );

      // TODO: When eventing is wired, insert outbox rows in this transaction for:
      // - spaces.space.created
      // - spaces.membership.created

      await client.query("COMMIT");

      return {
        membership: {
          role: "owner",
          space_id: space.id,
          user_id: currentUserId,
        },
        space: {
          account_id: space.account_id,
          id: space.id,
          name: space.name,
        },
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

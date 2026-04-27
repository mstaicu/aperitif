import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, userId: string }) => Promise<void>}
 */
export const deleteAccountMembership =
  (ctx) =>
  async ({ accountId, currentUserId, userId }) => {
    if (userId === currentUserId) {
      throw new Error("FORBIDDEN_SELF_TARGET");
    }

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

      const {
        rows: [targetMembership],
      } = await client.query(
        `
          SELECT role
          FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [accountId, userId],
      );

      if (!targetMembership) {
        await client.query("COMMIT");
        return;
      }

      if (targetMembership.role === "owner") {
        const { rows: owners } = await client.query(
          `
            SELECT user_id
            FROM account_memberships
            WHERE account_id = $1
              AND role = 'owner'
            FOR UPDATE
          `,
          [accountId],
        );

        if (owners.length <= 1) {
          throw new Error("LAST_OWNER");
        }
      }

      await client.query(
        `
          DELETE FROM account_memberships
          WHERE account_id = $1
            AND user_id = $2
        `,
        [accountId, userId],
      );

      // TODO: When eventing is wired, insert an outbox row in this transaction for:
      // - spaces.account_membership.deleted

      await client.query("COMMIT");
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

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
          SELECT id, name, kind, status
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

      const {
        rows: [{ version }],
      } = await client.query(
        `
          UPDATE accounts
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [accountId],
      );

      await client.query(
        `
          INSERT INTO outbox_events (subject, version, payload)
          VALUES ($1, $2, $3::jsonb)
        `,
        [
          "tenancy.account_membership.deleted",
          version,
          JSON.stringify({
            account: {
              id: account.id,
              kind: account.kind,
              name: account.name,
              status: account.status,
            },
            membership: {
              account_id: accountId,
              user_id: userId,
            },
          }),
        ],
      );

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

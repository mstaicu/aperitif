import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, role: "owner" | "member", userId: string }) => Promise<{
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
 * }>}
 */
export const createAccountMembership =
  (ctx) =>
  async ({ accountId, currentUserId, role, userId }) => {
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
          FOR UPDATE
        `,
        [accountId, currentUserId],
      );

      if (!currentMembership || currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [existingMembership],
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

      if (existingMembership) {
        if (existingMembership.role !== role) {
          throw new Error("ACCOUNT_MEMBERSHIP_ALREADY_EXISTS");
        }

        await client.query("COMMIT");

        return {
          account: {
            id: account.id,
            kind: account.kind,
            name: account.name,
            status: account.status,
          },
          membership: {
            account_id: accountId,
            role: existingMembership.role,
            user_id: userId,
          },
        };
      }

      // TODO: This assumes userId is a valid global identity UUID.
      // When an identity projection exists locally, validate it here.
      await client.query(
        `
          INSERT INTO account_memberships (account_id, user_id, role)
          VALUES ($1, $2, $3)
        `,
        [accountId, userId, role],
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
          "accounts.account_membership.created",
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
              role,
              user_id: userId,
            },
          }),
        ],
      );

      await client.query("COMMIT");

      return {
        account: {
          id: account.id,
          kind: account.kind,
          name: account.name,
          status: account.status,
        },
        membership: {
          account_id: accountId,
          role,
          user_id: userId,
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

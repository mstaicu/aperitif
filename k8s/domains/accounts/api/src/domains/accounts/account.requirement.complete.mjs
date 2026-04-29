import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { accountId: string, currentUserId: string, type: string }) => Promise<{
 *   account: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "pending_activation" | "active" | "suspended" | "closed",
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed" | "failed",
 *     type: string,
 *   }[],
 * }>}
 */
export const completeAccountRequirement =
  (ctx) =>
  async ({ accountId, currentUserId, type }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      let {
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
        rows: [membership],
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

      if (!membership || membership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [requirement],
      } = await client.query(
        `
          UPDATE account_requirements
          SET status = 'completed'
          WHERE account_id = $1
            AND type = $2
          RETURNING id
        `,
        [accountId, type],
      );

      if (!requirement) {
        throw new Error("ACCOUNT_REQUIREMENT_NOT_FOUND");
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

      const isComplete = requirements.every(
        (requirement) => requirement.status === "completed",
      );

      if (account.status === "pending_activation" && isComplete) {
        ({
          rows: [account],
        } = await client.query(
          `
            UPDATE accounts
            SET status = 'active'
            WHERE id = $1
            RETURNING id, name, kind, status
          `,
          [accountId],
        ));
      }

      await client.query("COMMIT");

      return {
        account: {
          id: account.id,
          kind: account.kind,
          name: account.name,
          status: account.status,
        },
        requirements: requirements.map((requirement) => ({
          id: requirement.id,
          status: requirement.status,
          type: requirement.type,
        })),
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

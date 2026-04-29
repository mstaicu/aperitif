import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

// Add or remove account activation steps here. Empty means accounts activate
// immediately; non-empty means requirements must complete before activation.
/** @type {string[]} */
const accountRequirements = [];

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, kind: "personal" | "organization", name: string }) => Promise<{
 *   account: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "pending_activation" | "active" | "suspended" | "closed",
 *   },
 *   membership: {
 *     account_id: string,
 *     role: "owner",
 *     user_id: string,
 *   },
 *   requirements: {
 *     id: string,
 *     status: "pending" | "completed" | "failed",
 *     type: string,
 *   }[],
 * }>}
 */
export const createAccount =
  (ctx) =>
  async ({ currentUserId, kind, name }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          INSERT INTO accounts (name, kind, status)
          VALUES ($1, $2, $3)
          RETURNING id, name, kind, status
        `,
        [
          name,
          kind,
          accountRequirements.length === 0 ? "active" : "pending_activation",
        ],
      );

      await client.query(
        `
          INSERT INTO account_memberships (account_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [account.id, currentUserId],
      );

      /** @type {{ id: string, status: "pending", type: string }[]} */
      let requirementRows = [];

      if (accountRequirements.length > 0) {
        const { rows } = await client.query(
          `
            INSERT INTO account_requirements (account_id, type, status)
            SELECT $1, unnest($2::text[]), 'pending'
            RETURNING id, type, status
          `,
          [account.id, accountRequirements],
        );

        requirementRows = rows;
      }

      // TODO: When eventing is wired, insert outbox rows in this transaction for:
      // - accounts.account.created
      // - accounts.account_membership.created

      await client.query("COMMIT");

      return {
        account: {
          id: account.id,
          kind: account.kind,
          name: account.name,
          status: account.status,
        },
        membership: {
          account_id: account.id,
          role: "owner",
          user_id: currentUserId,
        },
        requirements: requirementRows.map((requirement) => ({
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

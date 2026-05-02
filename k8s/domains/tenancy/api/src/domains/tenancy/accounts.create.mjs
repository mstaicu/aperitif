import {
  AccountCreatedPayloadCheck,
  AccountCreatedSchemaVersion,
  AccountCreatedSubject,
  AccountMembershipCreatedPayloadCheck,
  AccountMembershipCreatedSchemaVersion,
  AccountMembershipCreatedSubject,
  TENANCY_EVENT_PRODUCER,
} from "../../events/index.mjs";
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
 *     status: "pending" | "active",
 *   },
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
          RETURNING id, name, kind, status, version
        `,
        [name, kind, accountRequirements.length === 0 ? "active" : "pending"],
      );

      await client.query(
        `
          INSERT INTO account_memberships (account_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [account.id, currentUserId],
      );

      if (accountRequirements.length > 0) {
        await client.query(
          `
            INSERT INTO account_requirements (account_id, type, status)
            SELECT $1, unnest($2::text[]), 'pending'
          `,
          [account.id, accountRequirements],
        );
      }

      /** @type {import("../../events/index.mjs").AccountCreatedPayload} */
      const accountCreatedPayload = {
        account: {
          id: account.id,
          kind: account.kind,
          name: account.name,
          status: account.status,
        },
      };

      if (!AccountCreatedPayloadCheck.Check(accountCreatedPayload)) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            producer,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          AccountCreatedSubject,
          account.version,
          TENANCY_EVENT_PRODUCER,
          AccountCreatedSchemaVersion,
          JSON.stringify(accountCreatedPayload),
        ],
      );

      const {
        rows: [{ version: membershipVersion }],
      } = await client.query(
        `
          UPDATE accounts
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [account.id],
      );

      /** @type {import("../../events/index.mjs").AccountMembershipCreatedPayload} */
      const membershipCreatedPayload = {
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
      };

      if (
        !AccountMembershipCreatedPayloadCheck.Check(membershipCreatedPayload)
      ) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            producer,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          AccountMembershipCreatedSubject,
          membershipVersion,
          TENANCY_EVENT_PRODUCER,
          AccountMembershipCreatedSchemaVersion,
          JSON.stringify(membershipCreatedPayload),
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

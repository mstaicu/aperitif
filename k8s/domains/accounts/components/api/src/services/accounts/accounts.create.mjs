import {
  buildAccountCreatedV1Event,
  buildAccountMemberCreatedV1Event,
} from "@mstaicu/accounts-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   currentUserId: string,
 *   name: string,
 *   type: "individual" | "organization",
 * }) => Promise<{
 *   account: {
 *     id: string,
 *     name: string,
 *     type: "individual" | "organization",
 *   },
 * }>}
 */
export const createAccount =
  ({ pool }) =>
  async ({ currentUserId, name, type }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          INSERT INTO accounts (type, name)
          VALUES ($1, $2)
          RETURNING id, type, name, version
        `,
        [type, name],
      );

      await client.query(
        `
          INSERT INTO account_members (
            account_id,
            user_id,
            role
          )
          VALUES ($1, $2, 'owner')
        `,
        [account.id, currentUserId],
      );

      const accountCreatedEvent = buildAccountCreatedV1Event(
        {
          account: {
            id: account.id,
            name: account.name,
            type: account.type,
          },
        },
        Number(account.version),
      );
      const {
        rows: [versionedAccount],
      } = await client.query(
        `
          UPDATE accounts
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [account.id],
      );
      const memberCreatedEvent = buildAccountMemberCreatedV1Event(
        {
          account_id: account.id,
          member: {
            role: "owner",
            user_id: currentUserId,
          },
        },
        Number(versionedAccount.version),
      );
      const traceContext = /** @type {Record<string, string>} */ ({});

      propagation.inject(context.active(), traceContext);

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event,
            traceparent,
            tracestate
          )
          VALUES
            ($1, $2::jsonb, $3, $4),
            ($5, $6::jsonb, $3, $4)
        `,
        [
          accountCreatedEvent.id,
          JSON.stringify(accountCreatedEvent),
          traceContext.traceparent,
          traceContext.tracestate,
          memberCreatedEvent.id,
          JSON.stringify(memberCreatedEvent),
        ],
      );

      await client.query("COMMIT");

      return {
        account: {
          id: account.id,
          name: account.name,
          type: account.type,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };

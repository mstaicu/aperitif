import { buildAccountCreatedV1Event } from "@mstaicu/accounts-contracts";
import { context, propagation } from "@opentelemetry/api";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   currentUserId: string,
 *   name: string,
 *   type: "personal" | "organization",
 * }) => Promise<{
 *   account: {
 *     id: string,
 *     name: string,
 *     type: "personal" | "organization",
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
          VALUES ($1, $2::jsonb, $3, $4)
        `,
        [
          accountCreatedEvent.id,
          JSON.stringify(accountCreatedEvent),
          traceContext.traceparent,
          traceContext.tracestate,
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

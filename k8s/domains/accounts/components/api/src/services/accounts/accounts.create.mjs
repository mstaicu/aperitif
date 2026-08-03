import { buildAccountCreatedV1Event } from "@mstaicu/accounts-contracts";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: {
 *   currentUserId: string,
 *   name: string,
 *   type: "personal" | "business",
 * }) => Promise<{
 *   account: {
 *     id: string,
 *     name: string,
 *     type: "personal" | "business",
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
          member: {
            role: "owner",
            user_id: currentUserId,
          },
        },
        Number(account.version),
      );

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event
          )
          VALUES ($1, $2::jsonb)
        `,
        [accountCreatedEvent.id, JSON.stringify(accountCreatedEvent)],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          account_id: account.id,
          event: "account_created",
          level: "info",
          version: Number(account.version),
        }),
      );

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

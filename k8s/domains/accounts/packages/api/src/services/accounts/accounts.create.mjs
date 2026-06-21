import { DatabaseError } from "pg";

import { buildAccountMemberUpdatedEvent } from "../../events/index.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: { currentUserId: string, name: string }) => Promise<{
 *   account: {
 *     id: string,
 *     name: string,
 *   },
 * }>}
 */
export const createAccount =
  ({ db }) =>
  async ({ currentUserId, name }) => {
    let client;

    try {
      client = await db.connect();
      await client.query("BEGIN");

      const {
        rows: [account],
      } = await client.query(
        `
          INSERT INTO accounts (name)
          VALUES ($1)
          RETURNING id, name, version
        `,
        [name],
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

      const accountMemberUpdatedEvent = buildAccountMemberUpdatedEvent(
        {
          account: {
            id: account.id,
          },
          member: {
            account_id: account.id,
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
        [
          accountMemberUpdatedEvent.id,
          JSON.stringify(accountMemberUpdatedEvent),
        ],
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
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

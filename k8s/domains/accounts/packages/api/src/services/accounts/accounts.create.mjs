import { buildAccountOpenedEvent } from "@mstaicu/accounts-contracts";
import { DatabaseError } from "pg";

/**
 * @param {{ db: import("pg").Pool }} resources
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
  ({ db }) =>
  async ({ currentUserId, name, type }) => {
    let client;

    try {
      client = await db.connect();
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

      const accountOpenedEvent = buildAccountOpenedEvent(
        {
          account: {
            id: account.id,
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
        [accountOpenedEvent.id, JSON.stringify(accountOpenedEvent)],
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

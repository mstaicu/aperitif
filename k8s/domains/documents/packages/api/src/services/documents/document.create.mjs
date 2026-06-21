import { DatabaseError } from "pg";

const REQUIRED_ENTITLEMENT_ID = "documents.enabled";
const REQUIRED_ROLE = "owner";

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: {
 *   currentUserId: string,
 *   accountId: string,
 *   title: string,
 * }) => Promise<{
 *   created_by: string,
 *   id: string,
 *   account_id: string,
 *   title: string,
 * }>}
 */
export const createDocument =
  ({ db }) =>
  async ({ accountId, currentUserId, title }) => {
    let client;

    try {
      client = await db.connect();
      await client.query("BEGIN");

      const {
        rows: [member],
      } = /** @type {{ rows: { role?: string }[] }} */ (
        await client.query(
          `
            SELECT role
            FROM projected_account_members
            WHERE account_id = $1
              AND user_id = $2
          `,
          [accountId, currentUserId],
        )
      );

      if (member?.role !== REQUIRED_ROLE) {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [entitlementProjection],
      } =
        /** @type {{ rows: { entitlements?: Record<string, unknown> }[] }} */ (
          await client.query(
            `
              SELECT entitlements
              FROM projected_account_entitlements
              WHERE account_id = $1
            `,
            [accountId],
          )
        );

      const hasRequiredEntitlement =
        entitlementProjection?.entitlements?.[REQUIRED_ENTITLEMENT_ID] === true;

      if (!hasRequiredEntitlement) {
        throw new Error("ENTITLEMENT_REQUIRED");
      }

      const {
        rows: [document],
      } = await client.query(
        `
          INSERT INTO documents (
            account_id,
            title,
            created_by
          )
          VALUES ($1, $2, $3)
          RETURNING
            created_by,
            id,
            account_id,
            title
        `,
        [accountId, title, currentUserId],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          account_id: document.account_id,
          created_by: document.created_by,
          document_id: document.id,
          event: "document_created",
          level: "info",
        }),
      );

      return document;
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

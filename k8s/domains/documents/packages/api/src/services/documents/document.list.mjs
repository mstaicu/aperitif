import { DatabaseError } from "pg";

const REQUIRED_ENTITLEMENT_ID = "documents.enabled";
const REQUIRED_ROLE = "owner";

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {(args: {
 *   currentUserId: string,
 *   accountId: string,
 * }) => Promise<{
 *   created_by: string,
 *   id: string,
 *   account_id: string,
 *   title: string,
 * }[]>}
 */
export const listDocuments =
  ({ db }) =>
  async ({ accountId, currentUserId }) => {
    let client;

    try {
      client = await db.connect();

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

      const { rows: documents } = await client.query(
        `
          SELECT
            created_by,
            id,
            account_id,
            title
          FROM documents
          WHERE account_id = $1
          ORDER BY created_at DESC, id DESC
        `,
        [accountId],
      );

      return documents;
    } catch (err) {
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

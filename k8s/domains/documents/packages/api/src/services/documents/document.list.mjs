import { DatabaseError } from "pg";

const REQUIRED_CAPABILITY_ID = "documents.enabled";
const REQUIRED_PERMISSION_ID = "documents.read";

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
      } = /** @type {{ rows: { permissions?: Record<string, unknown> }[] }} */ (
        await client.query(
          `
            SELECT permissions
            FROM projected_account_members
            WHERE account_id = $1
              AND user_id = $2
              AND active = true
          `,
          [accountId, currentUserId],
        )
      );

      if (!member) {
        throw new Error("FORBIDDEN");
      }

      const hasRequiredPermission =
        member.permissions?.[REQUIRED_PERMISSION_ID] === true;

      if (!hasRequiredPermission) {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [capabilityProjection],
      } =
        /** @type {{ rows: { capabilities?: Record<string, unknown> }[] }} */ (
          await client.query(
            `
              SELECT capabilities
              FROM projected_account_capabilities
              WHERE account_id = $1
            `,
            [accountId],
          )
        );

      const hasRequiredCapability =
        capabilityProjection?.capabilities?.[REQUIRED_CAPABILITY_ID] === true;

      if (!hasRequiredCapability) {
        throw new Error("CAPABILITY_REQUIRED");
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

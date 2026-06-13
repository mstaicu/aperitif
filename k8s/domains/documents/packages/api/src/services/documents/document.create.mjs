import { DatabaseError } from "pg";

const REQUIRED_CAPABILITY_ID = "documents.enabled";
const REQUIRED_PERMISSION_ID = "documents.create";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
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
  (runtime) =>
  async ({ accountId, currentUserId, title }) => {
    let client;

    try {
      client = await runtime.db.connect();
      await client.query("BEGIN");

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

      if (err instanceof DatabaseError && err.code?.startsWith("08")) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

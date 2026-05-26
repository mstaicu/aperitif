import { DatabaseError } from "pg";

const REQUIRED_CAPABILITY_ID = "documents.enabled";
const REQUIRED_PERMISSION_ID = "documents.create";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   currentUserId: string,
 *   tenantId: string,
 *   title: string,
 * }) => Promise<{
 *   created_by: string,
 *   id: string,
 *   tenant_id: string,
 *   title: string,
 * }>}
 */
export const createDocument =
  (ctx) =>
  async ({ currentUserId, tenantId, title }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [member],
      } = /** @type {{ rows: { permissions?: Record<string, unknown> }[] }} */ (
        await client.query(
          `
            SELECT permissions
            FROM projected_tenant_members
            WHERE tenant_id = $1
              AND user_id = $2
              AND active = true
          `,
          [tenantId, currentUserId],
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
              FROM projected_tenant_capabilities
              WHERE tenant_id = $1
            `,
            [tenantId],
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
            tenant_id,
            title,
            created_by
          )
          VALUES ($1, $2, $3)
          RETURNING
            created_by,
            id,
            tenant_id,
            title
        `,
        [tenantId, title, currentUserId],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          created_by: document.created_by,
          document_id: document.id,
          event: "document_created",
          level: "info",
          tenant_id: document.tenant_id,
        }),
      );

      return document;
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError) {
        if (
          err.code?.startsWith("08") ||
          err.code === "53300" ||
          err.code === "57P01" ||
          err.code === "57P02" ||
          err.code === "57P03" ||
          err.code === "57014"
        ) {
          throw new Error("DATABASE_UNAVAILABLE", { cause: err });
        }
      }

      throw err;
    } finally {
      client?.release();
    }
  };

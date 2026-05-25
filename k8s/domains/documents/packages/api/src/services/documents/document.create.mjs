import { DatabaseError } from "pg";

const REQUIRED_CAPABILITY_ID = "documents.enabled";

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
        rows: [tenant],
      } = await client.query(
        `
          SELECT tenant_id
          FROM projected_tenants
          WHERE tenant_id = $1
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT 1
          FROM projected_tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenant.tenant_id, currentUserId],
      );

      if (!membership) {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [capabilityProjection],
      } =
        /** @type {{ rows: { capabilities?: { id?: unknown, value?: unknown }[] }[] }} */ (
          await client.query(
            `
              SELECT capabilities
              FROM projected_tenant_capabilities
              WHERE tenant_id = $1
            `,
            [tenant.tenant_id],
          )
        );

      const hasRequiredCapability =
        Array.isArray(capabilityProjection?.capabilities) &&
        capabilityProjection.capabilities.some(
          (capability) =>
            capability?.id === REQUIRED_CAPABILITY_ID &&
            capability?.value === true,
        );

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
        [tenant.tenant_id, title, currentUserId],
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

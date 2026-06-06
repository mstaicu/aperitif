import { DatabaseError } from "pg";

import { buildTenantMemberUpdatedEvent } from "../../events/index.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, name: string }) => Promise<{
 *   tenant: {
 *     id: string,
 *     name: string,
 *   },
 * }>}
 */
export const createTenant =
  (ctx) =>
  async ({ currentUserId, name }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          INSERT INTO tenants (name)
          VALUES ($1)
          RETURNING id, name, version
        `,
        [name],
      );

      await client.query(
        `
          INSERT INTO tenant_memberships (
            tenant_id,
            user_id,
            role_id
          )
          VALUES ($1, $2, 'owner')
        `,
        [tenant.id, currentUserId],
      );

      const { rows: permissions } = await client.query(
        `
          SELECT DISTINCT rp.permission_id AS id
          FROM tenant_memberships tm
          JOIN role_permissions rp ON rp.role_id = tm.role_id
          WHERE tm.tenant_id = $1
            AND tm.user_id = $2
          ORDER BY rp.permission_id
        `,
        [tenant.id, currentUserId],
      );

      const tenantMemberUpdatedEvent = buildTenantMemberUpdatedEvent(
        {
          member: {
            active: true,
            role_id: "owner",
            tenant_id: tenant.id,
            user_id: currentUserId,
          },
          permissions: permissions.map(({ id }) => ({
            id,
            value: true,
          })),
          tenant: {
            id: tenant.id,
          },
        },
        Number(tenant.version),
      );

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event
          )
          VALUES ($1, $2::jsonb)
        `,
        [tenantMemberUpdatedEvent.id, JSON.stringify(tenantMemberUpdatedEvent)],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "tenant_created",
          level: "info",
          tenant_id: tenant.id,
          version: Number(tenant.version),
        }),
      );

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
        },
      };
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

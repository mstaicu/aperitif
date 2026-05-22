import { DatabaseError } from "pg";

import {
  buildTenantMembershipUpdatedEvent,
  buildTenantUpdatedEvent,
} from "../../events/index.mjs";

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
          INSERT INTO tenant_memberships (tenant_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [tenant.id, currentUserId],
      );

      const tenantUpdatedEvent = buildTenantUpdatedEvent(
        {
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
        [tenantUpdatedEvent.id, JSON.stringify(tenantUpdatedEvent)],
      );

      const {
        rows: [{ version: membershipTenantVersion }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenant.id],
      );

      const membershipUpdatedEvent = buildTenantMembershipUpdatedEvent(
        {
          membership: {
            role: "owner",
            tenant_id: tenant.id,
            user_id: currentUserId,
          },
          tenant: {
            id: tenant.id,
          },
        },
        Number(membershipTenantVersion),
      );

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event
          )
          VALUES ($1, $2::jsonb)
        `,
        [membershipUpdatedEvent.id, JSON.stringify(membershipUpdatedEvent)],
      );

      await client.query("COMMIT");

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

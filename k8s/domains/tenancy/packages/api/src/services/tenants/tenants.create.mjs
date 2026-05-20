import {
  buildTenantMembershipUpdatedEvent,
  buildTenantUpdatedEvent,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, name: string, type: "personal" | "organization" }) => Promise<{
 *   tenant: {
 *     id: string,
 *     name: string,
 *     status: "active" | "disabled",
 *     type: "personal" | "organization",
 *   },
 * }>}
 */
export const createTenant =
  (ctx) =>
  async ({ currentUserId, name, type }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          INSERT INTO tenants (name, type, status)
          VALUES ($1, $2, DEFAULT)
          RETURNING id, name, type, status, version
        `,
        [name, type],
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
            status: tenant.status,
            type: tenant.type,
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
            status: "active",
            tenant_id: tenant.id,
            user_id: currentUserId,
          },
          tenant: {
            id: tenant.id,
            status: tenant.status,
            type: tenant.type,
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
          status: tenant.status,
          type: tenant.type,
        },
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

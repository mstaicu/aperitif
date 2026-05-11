import {
  buildTenantCreatedEvent,
  buildTenantMembershipCreatedEvent,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, name: string, type: "personal" | "organization" }) => Promise<{
 *   tenant: {
 *     id: string,
 *     name: string,
 *     status: "active" | "archived",
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
          VALUES ($1, $2, $3)
          RETURNING id, name, type, status, version
        `,
        [name, type, "active"],
      );

      await client.query(
        `
          INSERT INTO tenant_memberships (tenant_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [tenant.id, currentUserId],
      );

      const tenantCreatedEvent = buildTenantCreatedEvent({
        tenant: {
          id: tenant.id,
          status: tenant.status,
          type: tenant.type,
        },
      });

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          tenantCreatedEvent.subject,
          tenant.version,
          tenantCreatedEvent.schema_version,
          JSON.stringify(tenantCreatedEvent.payload),
        ],
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

      const membershipCreatedEvent = buildTenantMembershipCreatedEvent({
        membership: {
          role: "owner",
          tenant_id: tenant.id,
          user_id: currentUserId,
        },
        tenant: {
          id: tenant.id,
          status: tenant.status,
          type: tenant.type,
        },
      });

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          membershipCreatedEvent.subject,
          membershipTenantVersion,
          membershipCreatedEvent.schema_version,
          JSON.stringify(membershipCreatedEvent.payload),
        ],
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

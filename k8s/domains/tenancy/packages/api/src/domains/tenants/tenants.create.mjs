import {
  TenantCreatedPayloadCheck,
  TenantCreatedSchemaVersion,
  TenantCreatedSubject,
  TenantMembershipCreatedPayloadCheck,
  TenantMembershipCreatedSchemaVersion,
  TenantMembershipCreatedSubject,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { currentUserId: string, kind: "personal" | "organization", name: string }) => Promise<{
 *   tenant: {
 *     id: string,
 *     kind: "personal" | "organization",
 *     name: string,
 *     status: "pending" | "active",
 *   },
 * }>}
 */
export const createTenant =
  (ctx) =>
  async ({ currentUserId, kind, name }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const requirementResult = await client.query(
        `
          SELECT EXISTS (
            SELECT 1
            FROM requirement_rules
            WHERE subject_type = 'tenant'
              AND subject_kind = $1
              AND status = 'active'
          ) AS has_requirements
        `,
        [kind],
      );
      const hasRequirements = requirementResult.rows[0].has_requirements;

      const {
        rows: [tenant],
      } = await client.query(
        `
          INSERT INTO tenants (name, kind, status)
          VALUES ($1, $2, $3)
          RETURNING id, name, kind, status, version
        `,
        [name, kind, hasRequirements ? "pending" : "active"],
      );

      await client.query(
        `
          INSERT INTO tenant_memberships (tenant_id, user_id, role)
          VALUES ($1, $2, 'owner')
        `,
        [tenant.id, currentUserId],
      );

      await client.query(
        `
          INSERT INTO tenant_requirements (
            tenant_id,
            requirement_key,
            status
          )
          SELECT $1,
            requirement_key,
            'pending'
          FROM requirement_rules
          WHERE subject_type = 'tenant'
            AND subject_kind = $2
            AND status = 'active'
        `,
        [tenant.id, kind],
      );

      /** @type {import("../../events/index.mjs").TenantCreatedPayload} */
      const tenantCreatedPayload = {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
        },
      };

      if (!TenantCreatedPayloadCheck.Check(tenantCreatedPayload)) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            tenant_version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          TenantCreatedSubject,
          tenant.version,
          TenantCreatedSchemaVersion,
          JSON.stringify(tenantCreatedPayload),
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

      /** @type {import("../../events/index.mjs").TenantMembershipCreatedPayload} */
      const membershipCreatedPayload = {
        membership: {
          role: "owner",
          tenant_id: tenant.id,
          user_id: currentUserId,
        },
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
        },
      };

      if (
        !TenantMembershipCreatedPayloadCheck.Check(membershipCreatedPayload)
      ) {
        throw new Error("INVALID_EVENT_PAYLOAD");
      }

      await client.query(
        `
          INSERT INTO outbox_events (
            subject,
            tenant_version,
            schema_version,
            payload
          )
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          TenantMembershipCreatedSubject,
          membershipTenantVersion,
          TenantMembershipCreatedSchemaVersion,
          JSON.stringify(membershipCreatedPayload),
        ],
      );

      await client.query("COMMIT");

      return {
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
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

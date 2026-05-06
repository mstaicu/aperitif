import {
  TenantMembershipDeletedPayloadCheck,
  TenantMembershipDeletedSchemaVersion,
  TenantMembershipDeletedSubject,
} from "../../events/index.mjs";
import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: { tenantId: string, currentUserId: string, userId: string }) => Promise<void>}
 */
export const deleteTenantMembership =
  (ctx) =>
  async ({ currentUserId, tenantId, userId }) => {
    if (userId === currentUserId) {
      throw new Error("FORBIDDEN_SELF_TARGET");
    }

    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT id, name, kind, status
          FROM tenants
          WHERE id = $1
          FOR UPDATE
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      const {
        rows: [currentMembership],
      } = await client.query(
        `
          SELECT role
          FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenantId, currentUserId],
      );

      if (!currentMembership || currentMembership.role !== "owner") {
        throw new Error("FORBIDDEN");
      }

      const {
        rows: [targetMembership],
      } = await client.query(
        `
          SELECT role
          FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
          FOR UPDATE
        `,
        [tenantId, userId],
      );

      if (!targetMembership) {
        await client.query("COMMIT");
        return;
      }

      if (targetMembership.role === "owner") {
        const { rows: owners } = await client.query(
          `
            SELECT user_id
            FROM tenant_memberships
            WHERE tenant_id = $1
              AND role = 'owner'
            FOR UPDATE
          `,
          [tenantId],
        );

        if (owners.length <= 1) {
          throw new Error("LAST_OWNER");
        }
      }

      await client.query(
        `
          DELETE FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenantId, userId],
      );

      const {
        rows: [{ version: tenantVersion }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenantId],
      );

      /** @type {import("../../events/index.mjs").TenantMembershipDeletedPayload} */
      const membershipDeletedPayload = {
        membership: {
          tenant_id: tenantId,
          user_id: userId,
        },
        tenant: {
          id: tenant.id,
          kind: tenant.kind,
          name: tenant.name,
          status: tenant.status,
        },
      };

      if (
        !TenantMembershipDeletedPayloadCheck.Check(membershipDeletedPayload)
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
          TenantMembershipDeletedSubject,
          tenantVersion,
          TenantMembershipDeletedSchemaVersion,
          JSON.stringify(membershipDeletedPayload),
        ],
      );

      await client.query("COMMIT");
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

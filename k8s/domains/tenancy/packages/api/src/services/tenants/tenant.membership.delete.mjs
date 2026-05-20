import { buildTenantMembershipUpdatedEvent } from "../../events/index.mjs";
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
          SELECT id, type, status
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

      const membershipUpdatedEvent = buildTenantMembershipUpdatedEvent(
        {
          membership: {
            role: null,
            status: "deleted",
            tenant_id: tenantId,
            user_id: userId,
          },
          tenant: {
            id: tenant.id,
            status: tenant.status,
            type: tenant.type,
          },
        },
        Number(tenantVersion),
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

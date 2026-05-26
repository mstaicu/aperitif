import { DatabaseError } from "pg";

import { buildTenantMemberUpdatedEvent } from "../../events/index.mjs";

const REQUIRED_PERMISSION_ID = "members.manage";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   currentUserId: string,
 *   isPlatformOperator: boolean,
 *   roleId: string,
 *   tenantId: string,
 *   userId: string,
 * }) => Promise<{ tenant_id: string, user_id: string }>}
 */
export const assignTenantMemberRole =
  (ctx) =>
  async ({ currentUserId, isPlatformOperator, roleId, tenantId, userId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [tenant],
      } = await client.query(
        `
          SELECT 1
          FROM tenants
          WHERE id = $1
          FOR UPDATE
        `,
        [tenantId],
      );

      if (!tenant) {
        throw new Error("TENANT_NOT_FOUND");
      }

      if (!isPlatformOperator) {
        const {
          rows: [permission],
        } = await client.query(
          `
            SELECT 1
            FROM tenant_memberships tm
            JOIN role_permissions rp ON rp.role_id = tm.role_id
            WHERE tm.tenant_id = $1
              AND tm.user_id = $2
              AND rp.permission_id = $3
          `,
          [tenantId, currentUserId, REQUIRED_PERMISSION_ID],
        );

        if (!permission) {
          throw new Error("FORBIDDEN");
        }
      }

      const {
        rows: [membership],
      } = await client.query(
        `
          SELECT 1
          FROM tenant_memberships
          WHERE tenant_id = $1
            AND user_id = $2
        `,
        [tenantId, userId],
      );

      if (!membership) {
        throw new Error("TENANT_MEMBERSHIP_NOT_FOUND");
      }

      const {
        rows: [role],
      } = await client.query(
        `
          SELECT 1
          FROM roles
          WHERE id = $1
        `,
        [roleId],
      );

      if (!role) {
        throw new Error("ROLE_NOT_FOUND");
      }

      const roleChange = await client.query(
        `
          UPDATE tenant_memberships
          SET role_id = $3
          WHERE tenant_id = $1
            AND user_id = $2
            AND role_id <> $3
        `,
        [tenantId, userId, roleId],
      );

      if ((roleChange.rowCount ?? 0) === 0) {
        await client.query("COMMIT");

        return {
          tenant_id: tenantId,
          user_id: userId,
        };
      }

      const { rows: permissions } = await client.query(
        `
          SELECT DISTINCT rp.permission_id AS id
          FROM tenant_memberships tm
          JOIN role_permissions rp ON rp.role_id = tm.role_id
          WHERE tm.tenant_id = $1
            AND tm.user_id = $2
          ORDER BY rp.permission_id
        `,
        [tenantId, userId],
      );

      const {
        rows: [{ version }],
      } = await client.query(
        `
          UPDATE tenants
          SET version = version + 1
          WHERE id = $1
          RETURNING version
        `,
        [tenantId],
      );

      const event = buildTenantMemberUpdatedEvent(
        {
          member: {
            active: true,
            role_id: roleId,
            tenant_id: tenantId,
            user_id: userId,
          },
          permissions: permissions.map(({ id }) => ({
            id,
            value: true,
          })),
          tenant: {
            id: tenantId,
          },
        },
        Number(version),
      );

      await client.query(
        `
          INSERT INTO outbox_events (
            id,
            event
          )
          VALUES ($1, $2::jsonb)
        `,
        [event.id, JSON.stringify(event)],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "tenant_member_role_assigned",
          event_id: event.id,
          level: "info",
          permission_count: permissions.length,
          role_id: roleId,
          tenant_id: tenantId,
          user_id: userId,
          version: Number(version),
        }),
      );

      return {
        tenant_id: tenantId,
        user_id: userId,
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

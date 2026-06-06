import { DatabaseError } from "pg";

const ADMIN_ROLE_ID = "admin";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   roleId: string,
 *   userId: string,
 * }) => Promise<{ role_id: string, user_id: string }>}
 */
export const assignOperatorRole =
  (ctx) =>
  async ({ roleId, userId }) => {
    try {
      const {
        rows: [user],
      } = await ctx.persistence.db.query(
        `
          SELECT 1
          FROM users
          WHERE id = $1
        `,
        [userId],
      );

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      const {
        rows: [role],
      } = await ctx.persistence.db.query(
        `
          SELECT 1
          FROM operator_roles
          WHERE id = $1
        `,
        [roleId],
      );

      if (!role) {
        throw new Error("ROLE_NOT_FOUND");
      }

      await ctx.persistence.db.query(
        `
          INSERT INTO operator_users (
            user_id,
            role_id
          )
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [userId, roleId],
      );

      console.log(
        JSON.stringify({
          event: "operator_role_assigned",
          level: "info",
          role_id: roleId,
          user_id: userId,
        }),
      );

      return {
        role_id: roleId,
        user_id: userId,
      };
    } catch (err) {
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
    }
  };

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(args: {
 *   roleId: string,
 *   userId: string,
 * }) => Promise<{ role_id: string, user_id: string }>}
 */
export const revokeOperatorRole =
  (ctx) =>
  async ({ roleId, userId }) => {
    let client;

    try {
      client = await ctx.persistence.db.connect();
      await client.query("BEGIN");

      if (roleId === ADMIN_ROLE_ID) {
        await client.query(
          `
            SELECT 1
            FROM operator_roles
            WHERE id = $1
            FOR UPDATE
          `,
          [ADMIN_ROLE_ID],
        );

        const {
          rows: [{ admin_count: adminCount }],
        } = await client.query(
          `
            SELECT COUNT(*)::int AS admin_count
            FROM operator_users
            WHERE role_id = $1
          `,
          [ADMIN_ROLE_ID],
        );

        if (adminCount <= 1) {
          throw new Error("FORBIDDEN");
        }
      }

      await client.query(
        `
          DELETE FROM operator_users
          WHERE user_id = $1
            AND role_id = $2
        `,
        [userId, roleId],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "operator_role_revoked",
          level: "info",
          role_id: roleId,
          user_id: userId,
        }),
      );

      return {
        role_id: roleId,
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

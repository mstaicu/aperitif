import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const assignOperator =
  ({ pool }) =>
  async ({ userId }) => {
    try {
      const {
        rows: [user],
      } = await pool.query(
        `
          SELECT 1
          FROM users
          WHERE id = $1
        `,
        [userId],
      );

      if (!user) {
        throw createError("USER_NOT_FOUND");
      }

      await pool.query(
        `
          INSERT INTO operators (user_id)
          VALUES ($1)
          ON CONFLICT DO NOTHING
        `,
        [userId],
      );

      console.log(
        JSON.stringify({
          event: "operator_assigned",
          level: "info",
          user_id: userId,
        }),
      );

      return {
        user_id: userId,
      };
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };

/**
 * @param {{ pool: import("pg").Pool }} resources
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const revokeOperator =
  ({ pool }) =>
  async ({ userId }) => {
    let client;

    try {
      client = await pool.connect();
      await client.query("BEGIN");

      const { rows: operators } = await client.query(
        `
          SELECT user_id
          FROM operators
          FOR UPDATE
        `,
      );

      const removesLastOperator =
        operators.length <= 1 &&
        operators.some((operator) => operator.user_id === userId);

      if (removesLastOperator) {
        throw createError("FORBIDDEN");
      }

      await client.query(
        `
          DELETE FROM operators
          WHERE user_id = $1
        `,
        [userId],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "operator_revoked",
          level: "info",
          user_id: userId,
        }),
      );

      return {
        user_id: userId,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const assignOperator =
  (runtime) =>
  async ({ userId }) => {
    try {
      const {
        rows: [user],
      } = await runtime.db.query(
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

      await runtime.db.query(
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
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(args: { userId: string }) => Promise<{ user_id: string }>}
 */
export const revokeOperator =
  (runtime) =>
  async ({ userId }) => {
    let client;

    try {
      client = await runtime.db.connect();
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
        throw new Error("FORBIDDEN");
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

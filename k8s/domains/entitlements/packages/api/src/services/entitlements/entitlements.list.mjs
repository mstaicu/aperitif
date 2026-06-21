import { DatabaseError } from "pg";

/**
 * @param {{ db: import("pg").Pool }} resources
 * @returns {() => Promise<{
 *   entitlements: {
 *     id: string,
 *     merge_strategy: "boolean_or" | "number_max" | "number_sum",
 *     name: string,
 *     value_type: "boolean" | "number",
 *   }[],
 * }>}
 */
export const listEntitlements =
  ({ db }) =>
  async () => {
    try {
      const { rows } = await db.query(
        `
        SELECT id,
          merge_strategy,
          name,
          value_type
        FROM entitlements
        ORDER BY id
      `,
      );

      return {
        entitlements: rows,
      };
    } catch (err) {
      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    }
  };

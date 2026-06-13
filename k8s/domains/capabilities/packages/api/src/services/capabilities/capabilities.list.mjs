import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {() => Promise<{
 *   capabilities: {
 *     id: string,
 *     merge_strategy: "boolean_or" | "number_max" | "number_sum",
 *     name: string,
 *     value_type: "boolean" | "number",
 *   }[],
 * }>}
 */
export const listCapabilities = (runtime) => async () => {
  try {
    const { rows } = await runtime.db.query(
      `
        SELECT id,
          merge_strategy,
          name,
          value_type
        FROM capabilities
        ORDER BY id
      `,
    );

    return {
      capabilities: rows,
    };
  } catch (err) {
    if (err instanceof DatabaseError && err.code?.startsWith("08")) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};

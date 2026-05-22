import { DatabaseError } from "pg";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<{
 *   capabilities: {
 *     id: string,
 *     merge_strategy: "boolean_or" | "number_max" | "number_sum",
 *     name: string,
 *     value_type: "boolean" | "number",
 *   }[],
 * }>}
 */
export const listCapabilities = (ctx) => async () => {
  try {
    const { rows } = await ctx.persistence.db.query(
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

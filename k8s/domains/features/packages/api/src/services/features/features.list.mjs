import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<{
 *   features: {
 *     code: string,
 *     merge_strategy: "boolean_or" | "number_max" | "number_sum",
 *     name: string,
 *     type: "boolean" | "number",
 *   }[],
 * }>}
 */
export const listFeatures = (ctx) => async () => {
  try {
    const { rows } = await ctx.persistence.db.query(
      `
        SELECT code,
          name,
          type,
          merge_strategy
        FROM feature_definitions
        ORDER BY code
      `,
    );

    return {
      features: rows,
    };
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};

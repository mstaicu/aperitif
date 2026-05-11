import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<{
 *   products: {
 *     code: string,
 *     features: {
 *       code: string,
 *       name: string,
 *       type: "boolean" | "number",
 *       value: unknown,
 *     }[],
 *     name: string,
 *   }[],
 * }>}
 */
export const listProducts = (ctx) => async () => {
  try {
    const { rows } = await ctx.persistence.db.query(
      `
        SELECT p.code AS product_code,
          p.name AS product_name,
          f.code AS feature_code,
          f.name AS feature_name,
          f.type AS feature_type,
          pf.value AS feature_value
        FROM products p
        LEFT JOIN product_features pf ON pf.product_code = p.code
        LEFT JOIN feature_definitions f ON f.code = pf.feature_code
        ORDER BY p.code, f.code
      `,
    );

    const productsByCode = new Map();

    for (const row of rows) {
      if (!productsByCode.has(row.product_code)) {
        productsByCode.set(row.product_code, {
          code: row.product_code,
          features: [],
          name: row.product_name,
        });
      }

      if (row.feature_code) {
        const product = productsByCode.get(row.product_code);

        product.features.push({
          code: row.feature_code,
          name: row.feature_name,
          type: row.feature_type,
          value: row.feature_value,
        });
      }
    }

    return {
      products: [...productsByCode.values()],
    };
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};

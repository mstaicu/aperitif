import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<{
 *   products: {
 *     code: string,
 *     features: {
 *       key: string,
 *       name: string,
 *       value: unknown,
 *       value_type: "boolean" | "number" | "string" | "json",
 *     }[],
 *     name: string,
 *     prices: {
 *       amount_minor: number | null,
 *       billing_period: {
 *         count: number,
 *         unit: "day" | "week" | "month" | "year",
 *       } | null,
 *       billing_type: "recurring" | "one_time",
 *       code: string,
 *       currency_code: string | null,
 *       provider: string,
 *     }[],
 *     type: "plan" | "addon" | "top_up",
 *   }[],
 * }>}
 */
export const listProducts = (ctx) => async () => {
  try {
    const productResult = await ctx.persistence.db.query(
      `
        SELECT product_code,
          name,
          product_type
        FROM products
        WHERE status = 'active'
        ORDER BY product_code
      `,
    );

    const products = [];

    for (const product of productResult.rows) {
      const featuresResult = await ctx.persistence.db.query(
        `
          SELECT f.feature_key,
            f.name,
            f.value_type,
            pf.granted_value
          FROM product_features pf
          JOIN feature_definitions f ON f.feature_key = pf.feature_key
          WHERE pf.product_code = $1
            AND f.status = 'active'
          ORDER BY f.feature_key
        `,
        [product.product_code],
      );

      const pricesResult = await ctx.persistence.db.query(
        `
          SELECT price_code,
            provider,
            billing_type,
            billing_period_unit,
            billing_period_count,
            amount_minor,
            currency_code
          FROM product_prices
          WHERE product_code = $1
            AND status = 'active'
          ORDER BY price_code
        `,
        [product.product_code],
      );

      products.push({
        code: product.product_code,
        features: featuresResult.rows.map((feature) => ({
          key: feature.feature_key,
          name: feature.name,
          value: feature.granted_value,
          value_type: feature.value_type,
        })),
        name: product.name,
        prices: pricesResult.rows.map((price) => ({
          amount_minor: price.amount_minor,
          billing_period: price.billing_period_unit
            ? {
                count: price.billing_period_count,
                unit: price.billing_period_unit,
              }
            : null,
          billing_type: price.billing_type,
          code: price.price_code,
          currency_code: price.currency_code,
          provider: price.provider,
        })),
        type: product.product_type,
      });
    }

    return {
      products,
    };
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }
};

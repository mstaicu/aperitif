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
 *     type: "plan" | "addon" | "top_up" | "manual",
 *   }[],
 * }>}
 */
export const listProducts = (ctx) => async () => {
  let rows;

  try {
    ({ rows } = await ctx.persistence.db.query(
      `
        SELECT
          p.product_code,
          p.name,
          p.product_type,
          f.feature_key,
          f.name AS feature_name,
          f.value_type,
          pf.granted_value,
          pp.price_code,
          pp.provider,
          pp.billing_type,
          pp.billing_period_unit,
          pp.billing_period_count,
          pp.amount_minor,
          pp.currency_code
        FROM products p
        LEFT JOIN product_features pf ON pf.product_code = p.product_code
        LEFT JOIN features f ON f.feature_key = pf.feature_key
          AND f.status = 'active'
        LEFT JOIN product_prices pp ON pp.product_code = p.product_code
          AND pp.status = 'active'
        WHERE p.status = 'active'
        ORDER BY p.product_code,
          f.feature_key NULLS LAST,
          pp.price_code NULLS LAST
      `,
    ));
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      throw new Error("DATABASE_UNAVAILABLE", { cause: err });
    }

    throw err;
  }

  const products = [];
  const productsByCode = new Map();
  const featureKeysByProductCode = new Map();
  const priceCodesByProductCode = new Map();

  for (const row of rows) {
    let product = productsByCode.get(row.product_code);

    if (!product) {
      product = {
        code: row.product_code,
        features: [],
        name: row.name,
        prices: [],
        type: row.product_type,
      };

      productsByCode.set(row.product_code, product);
      featureKeysByProductCode.set(row.product_code, new Set());
      priceCodesByProductCode.set(row.product_code, new Set());
      products.push(product);
    }

    const featureKeys = featureKeysByProductCode.get(row.product_code);

    if (row.feature_key && !featureKeys.has(row.feature_key)) {
      featureKeys.add(row.feature_key);
      product.features.push({
        key: row.feature_key,
        name: row.feature_name,
        value: row.granted_value,
        value_type: row.value_type,
      });
    }

    const priceCodes = priceCodesByProductCode.get(row.product_code);

    if (row.price_code && !priceCodes.has(row.price_code)) {
      priceCodes.add(row.price_code);
      product.prices.push({
        amount_minor: row.amount_minor,
        billing_period: row.billing_period_unit
          ? {
              count: row.billing_period_count,
              unit: row.billing_period_unit,
            }
          : null,
        billing_type: row.billing_type,
        code: row.price_code,
        currency_code: row.currency_code,
        provider: row.provider,
      });
    }
  }

  return {
    products,
  };
};

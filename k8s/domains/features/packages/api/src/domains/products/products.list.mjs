import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {() => Promise<{
 *   products: {
 *     code: string,
 *     features: {
 *       code: string,
 *       name: string,
 *       type: "boolean" | "number" | "string",
 *       value: unknown,
 *     }[],
 *     name: string,
 *     offers: {
 *       amount_minor: number | null,
 *       code: string,
 *     }[],
 *   }[],
 * }>}
 */
export const listProducts = (ctx) => async () => {
  try {
    const productResult = await ctx.persistence.db.query(
      `
        SELECT code,
          name
        FROM products
        ORDER BY code
      `,
    );

    const products = [];

    for (const product of productResult.rows) {
      const featuresResult = await ctx.persistence.db.query(
        `
          SELECT f.code,
            f.name,
            f.type,
            pf.value
          FROM product_features pf
          JOIN feature_definitions f ON f.code = pf.feature_code
          WHERE pf.product_code = $1
          ORDER BY f.code
        `,
        [product.code],
      );

      const offersResult = await ctx.persistence.db.query(
        `
          SELECT code,
            amount_minor
          FROM product_offers
          WHERE product_code = $1
          ORDER BY code
        `,
        [product.code],
      );

      products.push({
        code: product.code,
        features: featuresResult.rows.map((feature) => ({
          code: feature.code,
          name: feature.name,
          type: feature.type,
          value: feature.value,
        })),
        name: product.name,
        offers: offersResult.rows.map((offer) => ({
          amount_minor: offer.amount_minor,
          code: offer.code,
        })),
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

import { listProducts } from "./products.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createProductsDomain = (ctx) => ({
  listProducts: listProducts(ctx),
});

/**
 * @typedef {ReturnType<typeof createProductsDomain>} ProductsDomain
 */

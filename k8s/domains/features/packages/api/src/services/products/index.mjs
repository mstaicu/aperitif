import { listProducts } from "./products.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createProductsService = (ctx) => ({
  listProducts: listProducts(ctx),
});

/**
 * @typedef {ReturnType<typeof createProductsService>} ProductsService
 */

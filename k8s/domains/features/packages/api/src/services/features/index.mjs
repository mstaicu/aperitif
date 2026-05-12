import { listFeatures } from "./features.list.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createFeaturesService = (ctx) => ({
  listFeatures: listFeatures(ctx),
});

/**
 * @typedef {ReturnType<typeof createFeaturesService>} FeaturesService
 */

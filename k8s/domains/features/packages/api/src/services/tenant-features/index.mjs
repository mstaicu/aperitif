import { addTenantFeatures } from "./tenant.feature-grant.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantFeaturesService = (ctx) => ({
  addTenantFeatures: addTenantFeatures(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantFeaturesService>} TenantFeaturesService
 */

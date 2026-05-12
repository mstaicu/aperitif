import { createTenantFeatureGrant } from "./tenant.feature-grant.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantFeaturesService = (ctx) => ({
  createTenantFeatureGrant: createTenantFeatureGrant(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantFeaturesService>} TenantFeaturesService
 */

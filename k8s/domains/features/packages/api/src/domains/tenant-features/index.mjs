import { createTenantFeatureGrant } from "./tenant.feature-grant.create.mjs";
import { createTenantProductGrant } from "./tenant.product-grant.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantFeaturesDomain = (ctx) => ({
  createTenantFeatureGrant: createTenantFeatureGrant(ctx),
  createTenantProductGrant: createTenantProductGrant(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantFeaturesDomain>} TenantFeaturesDomain
 */

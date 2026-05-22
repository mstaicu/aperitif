import { addTenantCapabilities } from "./tenant.capability-grant.create.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantCapabilitiesService = (ctx) => ({
  addTenantCapabilities: addTenantCapabilities(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantCapabilitiesService>} TenantCapabilitiesService
 */

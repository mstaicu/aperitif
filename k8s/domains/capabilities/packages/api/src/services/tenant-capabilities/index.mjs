import { addTenantCapabilities } from "./tenant.capability-grant.create.mjs";
import { revokeTenantCapabilities } from "./tenant.capability-grant.revoke.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createTenantCapabilitiesService = (ctx) => ({
  addTenantCapabilities: addTenantCapabilities(ctx),
  revokeTenantCapabilities: revokeTenantCapabilities(ctx),
});

/**
 * @typedef {ReturnType<typeof createTenantCapabilitiesService>} TenantCapabilitiesService
 */

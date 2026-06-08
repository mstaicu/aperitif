import { addAccountCapabilities } from "./account.capability-grant.create.mjs";
import { revokeAccountCapabilities } from "./account.capability-grant.revoke.mjs";

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 */
export const createAccountCapabilitiesService = (ctx) => ({
  addAccountCapabilities: addAccountCapabilities(ctx),
  revokeAccountCapabilities: revokeAccountCapabilities(ctx),
});

/**
 * @typedef {ReturnType<typeof createAccountCapabilitiesService>} AccountCapabilitiesService
 */

import { addAccountCapabilities } from "./account.capability-grant.create.mjs";
import { revokeAccountCapabilities } from "./account.capability-grant.revoke.mjs";

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 */
export const createAccountCapabilitiesService = (runtime) => ({
  addAccountCapabilities: addAccountCapabilities(runtime),
  revokeAccountCapabilities: revokeAccountCapabilities(runtime),
});

/**
 * @typedef {ReturnType<typeof createAccountCapabilitiesService>} AccountCapabilitiesService
 */

import { addAccountCapabilities } from "./account.capability-grant.create.mjs";
import { revokeAccountCapabilities } from "./account.capability-grant.revoke.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createAccountCapabilitiesService = ({ db }) => ({
  addAccountCapabilities: addAccountCapabilities({ db }),
  revokeAccountCapabilities: revokeAccountCapabilities({ db }),
});

/**
 * @typedef {ReturnType<typeof createAccountCapabilitiesService>} AccountCapabilitiesService
 */

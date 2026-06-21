import { addAccountEntitlements } from "./account.entitlement-grant.create.mjs";
import { revokeAccountEntitlements } from "./account.entitlement-grant.revoke.mjs";

/**
 * @param {{ db: import("pg").Pool }} resources
 */
export const createAccountEntitlementsService = ({ db }) => ({
  addAccountEntitlements: addAccountEntitlements({ db }),
  revokeAccountEntitlements: revokeAccountEntitlements({ db }),
});

/**
 * @typedef {ReturnType<typeof createAccountEntitlementsService>} AccountEntitlementsService
 */

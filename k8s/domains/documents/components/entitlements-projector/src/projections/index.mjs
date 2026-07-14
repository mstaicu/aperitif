import { AccountEntitlementsUpdatedV1Type } from "@mstaicu/entitlements-contracts";

import { projectAccountEntitlementsUpdatedV1 } from "./account-entitlements-updated-v1.mjs";

/** @type {Record<string, typeof projectAccountEntitlementsUpdatedV1>} */
export const projections = {
  [AccountEntitlementsUpdatedV1Type]: projectAccountEntitlementsUpdatedV1,
};

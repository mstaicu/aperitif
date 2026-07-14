import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";

import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

/** @type {Record<string, typeof projectAccountOpenedV1>} */
export const projections = {
  [AccountOpenedV1Type]: projectAccountOpenedV1,
};

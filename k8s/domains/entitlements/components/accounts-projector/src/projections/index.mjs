import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";

import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

/** @typedef {(args: { db: import("pg").Pool, event: unknown }) => Promise<void>} Projection */
/** @type {Record<string, Projection>} */
export const projections = {
  [AccountOpenedV1Type]: projectAccountOpenedV1,
};

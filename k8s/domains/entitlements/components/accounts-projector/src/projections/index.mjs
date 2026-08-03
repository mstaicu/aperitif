import { AccountCreatedV1Type } from "@mstaicu/accounts-contracts";

import { projectAccountCreatedV1 } from "./account-created-v1.mjs";

/** @typedef {(args: { db: import("pg").Pool, event: unknown }) => Promise<void>} Projection */
/** @type {Record<string, Projection>} */
export const projections = {
  [AccountCreatedV1Type]: projectAccountCreatedV1,
};

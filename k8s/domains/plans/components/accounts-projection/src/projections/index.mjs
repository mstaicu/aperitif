import { AccountCreatedV1Type } from "@mstaicu/accounts-contracts";

import { projectAccountCreatedV1 } from "./account-created-v1.mjs";

/** @typedef {(args: { event: unknown, pool: import("pg").Pool }) => Promise<void>} Projection */
/** @type {Record<string, Projection>} */
export const projections = {
  [AccountCreatedV1Type]: projectAccountCreatedV1,
};

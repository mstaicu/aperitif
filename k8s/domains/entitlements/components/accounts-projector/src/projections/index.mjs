import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";

import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

/**
 * @type {Record<string, (args: {
 *   db: import("pg").Pool,
 *   event: unknown,
 * }) => Promise<void>>}
 */
export const projections = {
  [AccountOpenedV1Type]: projectAccountOpenedV1,
};

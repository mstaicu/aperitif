import { randomUUID } from "node:crypto";

import {
  AccountEntitlementsUpdatedSource,
  AccountEntitlementsUpdatedType,
} from "@mstaicu/entitlements-contracts";

export { AccountEntitlementsUpdatedType };

/**
 * @typedef {{
 *   account: { id: string },
 *   entitlements: Array<{ id: string, value: boolean | number }>,
 * }} AccountEntitlementsUpdatedData
 */

/**
 * @param {AccountEntitlementsUpdatedData} data
 * @param {number} version
 * @returns {{
 *   datacontenttype: "application/json",
 *   data: AccountEntitlementsUpdatedData & { version: number },
 *   id: string,
 *   source: string,
 *   specversion: "1.0",
 *   time: string,
 *   type: string,
 * }}
 */
export function buildAccountEntitlementsUpdatedEvent(data, version) {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    datacontenttype: "application/json",
    data: {
      ...data,
      version,
    },
    id: randomUUID(),
    source: AccountEntitlementsUpdatedSource,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountEntitlementsUpdatedType,
  };
}

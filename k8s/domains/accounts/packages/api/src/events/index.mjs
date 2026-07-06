import { randomUUID } from "node:crypto";

import {
  AccountOpenedSource,
  AccountOpenedType,
} from "@mstaicu/accounts-contracts";

export { AccountOpenedType };

/**
 * @typedef {{
 *   account: { id: string },
 *   member: { role: string, user_id: string },
 * }} AccountOpenedData
 */

/**
 * @param {AccountOpenedData} data
 * @param {number} version
 * @returns {{
 *   datacontenttype: "application/json",
 *   data: AccountOpenedData & { version: number },
 *   id: string,
 *   source: string,
 *   specversion: "1.0",
 *   time: string,
 *   type: string,
 * }}
 */
export function buildAccountOpenedEvent(data, version) {
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
    source: AccountOpenedSource,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountOpenedType,
  };
}

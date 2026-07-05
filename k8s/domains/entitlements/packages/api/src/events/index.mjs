import { randomUUID } from "node:crypto";

export const AccountEntitlementsUpdatedSubject =
  "entitlements.account_entitlements.updated";
export const AccountEntitlementsUpdatedSchemaVersion = 1;

/**
 * @typedef {{
 *   account: { id: string },
 *   entitlements: Array<{ id: string, value: boolean | number }>,
 * }} AccountEntitlementsUpdatedPayload
 */

/**
 * @param {AccountEntitlementsUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: AccountEntitlementsUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildAccountEntitlementsUpdatedEvent(payload, version) {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: AccountEntitlementsUpdatedSchemaVersion,
    subject: AccountEntitlementsUpdatedSubject,
    version,
  };
}

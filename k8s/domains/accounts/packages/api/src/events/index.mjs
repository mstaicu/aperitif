import { randomUUID } from "node:crypto";

export const AccountOpenedSubject = "accounts.account.opened";
export const AccountOpenedSchemaVersion = 1;

/**
 * @typedef {{
 *   account: { id: string },
 *   member: { role: string, user_id: string },
 * }} AccountOpenedPayload
 */

/**
 * @param {AccountOpenedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: AccountOpenedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildAccountOpenedEvent(payload, version) {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: AccountOpenedSchemaVersion,
    subject: AccountOpenedSubject,
    version,
  };
}

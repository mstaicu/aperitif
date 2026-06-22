import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const ACCOUNTS_EVENT_SCHEMA_VERSION = 1;

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const AccountEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
  },
  { additionalProperties: false },
);

export const AccountsEventEnvelopeSchema = Type.Object(
  {
    id: UuidSchema,
    payload: Type.Object({}, { additionalProperties: true }),
    schema_version: Type.Integer({ minimum: 1 }),
    subject: Type.String({ minLength: 1 }),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountsEventEnvelopeSchema
 * >} AccountsEventEnvelope
 */

export const AccountsEventEnvelopeCheck = TypeCompiler.Compile(
  AccountsEventEnvelopeSchema,
);

export const AccountOpenedSubject = "accounts.account.opened";
export const AccountOpenedSchemaVersion = ACCOUNTS_EVENT_SCHEMA_VERSION;

const AccountMemberEventResourceSchema = Type.Object(
  {
    role: Type.String({ minLength: 1 }),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const AccountOpenedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    member: AccountMemberEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedPayloadSchema
 * >} AccountOpenedPayload
 */

export const AccountOpenedPayloadCheck = TypeCompiler.Compile(
  AccountOpenedPayloadSchema,
);

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
  if (!AccountOpenedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

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

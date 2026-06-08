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

export const AccountMemberUpdatedSubject = "accounts.account_member.updated";
export const AccountMemberUpdatedSchemaVersion = ACCOUNTS_EVENT_SCHEMA_VERSION;

const AccountMemberEventResourceSchema = Type.Object(
  {
    account_id: UuidSchema,
    active: Type.Boolean(),
    role_id: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

const PermissionEventResourceSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    value: Type.Literal(true),
  },
  { additionalProperties: false },
);

export const AccountMemberUpdatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    member: AccountMemberEventResourceSchema,
    permissions: Type.Array(PermissionEventResourceSchema),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMemberUpdatedPayloadSchema
 * >} AccountMemberUpdatedPayload
 */

export const AccountMemberUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountMemberUpdatedPayloadSchema,
);

/**
 * @param {AccountMemberUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: AccountMemberUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildAccountMemberUpdatedEvent(payload, version) {
  if (!AccountMemberUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: AccountMemberUpdatedSchemaVersion,
    subject: AccountMemberUpdatedSubject,
    version,
  };
}

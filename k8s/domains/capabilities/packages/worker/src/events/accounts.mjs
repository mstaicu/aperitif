import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const AccountMemberUpdatedSchemaVersion = 1;
export const AccountMemberUpdatedSubject = "accounts.account_member.updated";

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
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
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

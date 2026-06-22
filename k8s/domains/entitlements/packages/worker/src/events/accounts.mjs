import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const AccountOpenedSchemaVersion = 1;
export const AccountOpenedSubject = "accounts.account.opened";

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
    role: Type.String({ minLength: 1 }),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const AccountOpenedPayloadSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
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

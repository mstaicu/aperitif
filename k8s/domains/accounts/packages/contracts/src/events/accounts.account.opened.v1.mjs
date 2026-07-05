import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const AccountOpenedSubject = "accounts.account.opened";
export const AccountOpenedSchemaVersion = 1;

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{12}$",
});

export const AccountOpenedPayloadSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    member: Type.Object(
      {
        role: Type.String({ minLength: 1 }),
        user_id: UuidSchema,
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export const AccountOpenedEventSchema = Type.Object(
  {
    id: UuidSchema,
    payload: AccountOpenedPayloadSchema,
    schema_version: Type.Literal(AccountOpenedSchemaVersion),
    subject: Type.Literal(AccountOpenedSubject),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedPayloadSchema
 * >} AccountOpenedPayload
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedEventSchema
 * >} AccountOpenedEvent
 */

export const AccountOpenedPayloadCheck = TypeCompiler.Compile(
  AccountOpenedPayloadSchema,
);

export const AccountOpenedEventCheck = TypeCompiler.Compile(
  AccountOpenedEventSchema,
);

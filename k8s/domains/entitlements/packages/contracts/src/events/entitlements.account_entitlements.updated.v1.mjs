import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const AccountEntitlementsUpdatedSubject =
  "entitlements.account_entitlements.updated";
export const AccountEntitlementsUpdatedSchemaVersion = 1;

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{12}$",
});

export const AccountEntitlementsUpdatedPayloadSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    entitlements: Type.Array(
      Type.Object(
        {
          id: Type.String({ minLength: 1 }),
          value: Type.Union([Type.Boolean(), Type.Number()]),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const AccountEntitlementsUpdatedEventSchema = Type.Object(
  {
    id: UuidSchema,
    payload: AccountEntitlementsUpdatedPayloadSchema,
    schema_version: Type.Literal(AccountEntitlementsUpdatedSchemaVersion),
    subject: Type.Literal(AccountEntitlementsUpdatedSubject),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedPayloadSchema
 * >} AccountEntitlementsUpdatedPayload
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedEventSchema
 * >} AccountEntitlementsUpdatedEvent
 */

export const AccountEntitlementsUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountEntitlementsUpdatedPayloadSchema,
);

export const AccountEntitlementsUpdatedEventCheck = TypeCompiler.Compile(
  AccountEntitlementsUpdatedEventSchema,
);

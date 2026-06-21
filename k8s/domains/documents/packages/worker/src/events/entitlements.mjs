import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const ENTITLEMENTS_EVENT_SCHEMA_VERSION = 1;

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

export const AccountEntitlementEventResourceSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    value: Type.Union([Type.Boolean(), Type.Number()]),
  },
  { additionalProperties: false },
);

export const EntitlementsEventEnvelopeSchema = Type.Object(
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
 *   typeof EntitlementsEventEnvelopeSchema
 * >} EntitlementsEventEnvelope
 */

export const EntitlementsEventEnvelopeCheck = TypeCompiler.Compile(
  EntitlementsEventEnvelopeSchema,
);

export const AccountEntitlementsUpdatedSubject =
  "entitlements.account_entitlements.updated";

export const AccountEntitlementsUpdatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    entitlements: Type.Array(AccountEntitlementEventResourceSchema),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedPayloadSchema
 * >} AccountEntitlementsUpdatedPayload
 */

export const AccountEntitlementsUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountEntitlementsUpdatedPayloadSchema,
);

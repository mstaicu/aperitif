import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

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
export const AccountEntitlementsUpdatedSchemaVersion =
  ENTITLEMENTS_EVENT_SCHEMA_VERSION;

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
  if (!AccountEntitlementsUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

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

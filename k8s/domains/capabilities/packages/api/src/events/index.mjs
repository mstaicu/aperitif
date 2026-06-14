import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const CAPABILITIES_EVENT_SCHEMA_VERSION = 1;

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

export const AccountCapabilityEventResourceSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    value: Type.Union([Type.Boolean(), Type.Number()]),
  },
  { additionalProperties: false },
);

export const CapabilitiesEventEnvelopeSchema = Type.Object(
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
 *   typeof CapabilitiesEventEnvelopeSchema
 * >} CapabilitiesEventEnvelope
 */

export const CapabilitiesEventEnvelopeCheck = TypeCompiler.Compile(
  CapabilitiesEventEnvelopeSchema,
);

export const AccountCapabilitiesUpdatedSubject =
  "capabilities.account_capabilities.updated";
export const AccountCapabilitiesUpdatedSchemaVersion =
  CAPABILITIES_EVENT_SCHEMA_VERSION;

export const AccountCapabilitiesUpdatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    capabilities: Type.Array(AccountCapabilityEventResourceSchema),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountCapabilitiesUpdatedPayloadSchema
 * >} AccountCapabilitiesUpdatedPayload
 */

export const AccountCapabilitiesUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountCapabilitiesUpdatedPayloadSchema,
);

/**
 * @param {AccountCapabilitiesUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: AccountCapabilitiesUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildAccountCapabilitiesUpdatedEvent(payload, version) {
  if (!AccountCapabilitiesUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: AccountCapabilitiesUpdatedSchemaVersion,
    subject: AccountCapabilitiesUpdatedSubject,
    version,
  };
}

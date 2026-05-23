import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const TENANCY_EVENT_SCHEMA_VERSION = 1;

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const TenantRoleSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("member"),
]);

export const TenantEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
  },
  { additionalProperties: false },
);

export const TenancyEventEnvelopeSchema = Type.Object(
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
 *   typeof TenancyEventEnvelopeSchema
 * >} TenancyEventEnvelope
 */

export const TenancyEventEnvelopeCheck = TypeCompiler.Compile(
  TenancyEventEnvelopeSchema,
);

export const TenantMembershipUpdatedSubject =
  "tenancy.tenant_membership.updated";
export const TenantMembershipUpdatedSchemaVersion =
  TENANCY_EVENT_SCHEMA_VERSION;

const TenantMembershipUpdatedEventResourceSchema = Type.Object(
  {
    role: TenantRoleSchema,
    tenant_id: UuidSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const TenantMembershipUpdatedPayloadSchema = Type.Object(
  {
    membership: TenantMembershipUpdatedEventResourceSchema,
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipUpdatedPayloadSchema
 * >} TenantMembershipUpdatedPayload
 */

export const TenantMembershipUpdatedPayloadCheck = TypeCompiler.Compile(
  TenantMembershipUpdatedPayloadSchema,
);

export const TenantUpdatedSubject = "tenancy.tenant.updated";
export const TenantUpdatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

export const TenantUpdatedPayloadSchema = Type.Object(
  {
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantUpdatedPayloadSchema
 * >} TenantUpdatedPayload
 */

export const TenantUpdatedPayloadCheck = TypeCompiler.Compile(
  TenantUpdatedPayloadSchema,
);

/**
 * @param {TenantMembershipUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: TenantMembershipUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildTenantMembershipUpdatedEvent(payload, version) {
  if (!TenantMembershipUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantMembershipUpdatedSchemaVersion,
    subject: TenantMembershipUpdatedSubject,
    version,
  };
}

/**
 * @param {TenantUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: TenantUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildTenantUpdatedEvent(payload, version) {
  if (!TenantUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantUpdatedSchemaVersion,
    subject: TenantUpdatedSubject,
    version,
  };
}

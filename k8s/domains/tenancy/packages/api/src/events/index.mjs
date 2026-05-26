import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const TENANCY_EVENT_SCHEMA_VERSION = 1;

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

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

export const TenantMemberUpdatedSubject = "tenancy.tenant_member.updated";
export const TenantMemberUpdatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

const TenantMemberEventResourceSchema = Type.Object(
  {
    active: Type.Boolean(),
    role_id: Type.Union([Type.String({ minLength: 1 }), Type.Null()]),
    tenant_id: UuidSchema,
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

export const TenantMemberUpdatedPayloadSchema = Type.Object(
  {
    member: TenantMemberEventResourceSchema,
    permissions: Type.Array(PermissionEventResourceSchema),
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMemberUpdatedPayloadSchema
 * >} TenantMemberUpdatedPayload
 */

export const TenantMemberUpdatedPayloadCheck = TypeCompiler.Compile(
  TenantMemberUpdatedPayloadSchema,
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
 * @param {TenantMemberUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: TenantMemberUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildTenantMemberUpdatedEvent(payload, version) {
  if (!TenantMemberUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantMemberUpdatedSchemaVersion,
    subject: TenantMemberUpdatedSubject,
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

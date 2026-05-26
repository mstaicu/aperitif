import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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

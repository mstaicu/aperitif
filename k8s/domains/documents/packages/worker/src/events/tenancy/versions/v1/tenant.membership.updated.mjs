import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import {
  TenantEventResourceSchema,
  TenantRoleSchema,
  UuidSchema,
} from "./resources.mjs";

export const TenantMembershipUpdatedSubject =
  "tenancy.tenant_membership.updated";

export const TenantMembershipStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("deleted"),
]);

const TenantMembershipUpdatedEventResourceSchema = Type.Object(
  {
    role: Type.Union([TenantRoleSchema, Type.Null()]),
    status: TenantMembershipStatusSchema,
    tenant_id: UuidSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipUpdatedEventResourceSchema
 * >} TenantMembershipUpdatedEventResource
 */

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

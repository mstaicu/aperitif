import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantEventResourceSchema,
  TenantRoleSchema,
  UuidSchema,
} from "./resources.mjs";

export const TenantMembershipUpdatedSubject =
  "tenancy.tenant_membership.updated";
export const TenantMembershipUpdatedSchemaVersion =
  TENANCY_EVENT_SCHEMA_VERSION;

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

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantMembershipUpdatedSchemaVersion,
    subject: TenantMembershipUpdatedSubject,
    version,
  };
}

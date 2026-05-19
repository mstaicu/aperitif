import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { TenantEventResourceSchema, UuidSchema } from "./resources.mjs";

export const TenantMembershipDeletedSubject =
  "tenancy.tenant_membership.deleted";
export const TenantMembershipDeletedSchemaVersion =
  TENANCY_EVENT_SCHEMA_VERSION;

const TenantMembershipDeletedEventResourceSchema = Type.Object(
  {
    tenant_id: UuidSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipDeletedEventResourceSchema
 * >} TenantMembershipDeletedEventResource
 */

export const TenantMembershipDeletedPayloadSchema = Type.Object(
  {
    membership: TenantMembershipDeletedEventResourceSchema,
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipDeletedPayloadSchema
 * >} TenantMembershipDeletedPayload
 */

export const TenantMembershipDeletedPayloadCheck = TypeCompiler.Compile(
  TenantMembershipDeletedPayloadSchema,
);

/**
 * @param {TenantMembershipDeletedPayload} payload
 * @returns {{
 *   payload: TenantMembershipDeletedPayload,
 *   schema_version: number,
 *   subject: string,
 * }}
 */
export function buildTenantMembershipDeletedEvent(payload) {
  if (!TenantMembershipDeletedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    payload,
    schema_version: TenantMembershipDeletedSchemaVersion,
    subject: TenantMembershipDeletedSubject,
  };
}

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantEventResourceSchema,
  TenantRoleSchema,
  UuidSchema,
} from "./resources.mjs";

export const TenantMembershipCreatedSubject =
  "tenancy.tenant_membership.created";
export const TenantMembershipCreatedSchemaVersion =
  TENANCY_EVENT_SCHEMA_VERSION;

const TenantMembershipCreatedEventResourceSchema = Type.Object(
  {
    role: TenantRoleSchema,
    tenant_id: UuidSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipCreatedEventResourceSchema
 * >} TenantMembershipCreatedEventResource
 */

export const TenantMembershipCreatedPayloadSchema = Type.Object(
  {
    membership: TenantMembershipCreatedEventResourceSchema,
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantMembershipCreatedPayloadSchema
 * >} TenantMembershipCreatedPayload
 */

export const TenantMembershipCreatedPayloadCheck = TypeCompiler.Compile(
  TenantMembershipCreatedPayloadSchema,
);

/**
 * @param {TenantMembershipCreatedPayload} payload
 * @returns {{
 *   payload: TenantMembershipCreatedPayload,
 *   schema_version: number,
 *   subject: string,
 * }}
 */
export function buildTenantMembershipCreatedEvent(payload) {
  if (!TenantMembershipCreatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    payload,
    schema_version: TenantMembershipCreatedSchemaVersion,
    subject: TenantMembershipCreatedSubject,
  };
}

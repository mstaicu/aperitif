import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { TenantEventResourceSchema } from "./resources.mjs";

export const TenantCreatedSubject = "tenancy.tenant.created";
export const TenantCreatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

export const TenantCreatedPayloadSchema = Type.Object(
  {
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantCreatedPayloadSchema
 * >} TenantCreatedPayload
 */

export const TenantCreatedPayloadCheck = TypeCompiler.Compile(
  TenantCreatedPayloadSchema,
);

/**
 * @param {TenantCreatedPayload} payload
 * @returns {{
 *   payload: TenantCreatedPayload,
 *   schema_version: number,
 *   subject: string,
 * }}
 */
export function buildTenantCreatedEvent(payload) {
  if (!TenantCreatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    payload,
    schema_version: TenantCreatedSchemaVersion,
    subject: TenantCreatedSubject,
  };
}

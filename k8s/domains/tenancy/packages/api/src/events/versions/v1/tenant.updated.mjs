import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { TenantEventResourceSchema } from "./resources.mjs";

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

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantUpdatedSchemaVersion,
    subject: TenantUpdatedSubject,
    version,
  };
}

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { CAPABILITIES_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantCapabilityEventResourceSchema,
  TenantEventResourceSchema,
} from "./resources.mjs";

export const TenantCapabilitiesUpdatedSubject =
  "capabilities.tenant_capabilities.updated";
export const TenantCapabilitiesUpdatedSchemaVersion =
  CAPABILITIES_EVENT_SCHEMA_VERSION;

export const TenantCapabilitiesUpdatedPayloadSchema = Type.Object(
  {
    capabilities: Type.Array(TenantCapabilityEventResourceSchema),
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantCapabilitiesUpdatedPayloadSchema
 * >} TenantCapabilitiesUpdatedPayload
 */

export const TenantCapabilitiesUpdatedPayloadCheck = TypeCompiler.Compile(
  TenantCapabilitiesUpdatedPayloadSchema,
);

/**
 * @param {TenantCapabilitiesUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: TenantCapabilitiesUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildTenantCapabilitiesUpdatedEvent(payload, version) {
  if (!TenantCapabilitiesUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: TenantCapabilitiesUpdatedSchemaVersion,
    subject: TenantCapabilitiesUpdatedSubject,
    version,
  };
}

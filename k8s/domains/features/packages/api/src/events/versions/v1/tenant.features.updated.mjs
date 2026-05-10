import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { FEATURES_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantEventResourceSchema,
  TenantFeatureEventResourceSchema,
} from "./resources.mjs";

export const TenantFeaturesUpdatedSubject = "features.tenant_features.updated";
export const TenantFeaturesUpdatedSchemaVersion = FEATURES_EVENT_SCHEMA_VERSION;

export const TenantFeaturesUpdatedPayloadSchema = Type.Object(
  {
    features: Type.Array(TenantFeatureEventResourceSchema),
    tenant: TenantEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantFeaturesUpdatedPayloadSchema
 * >} TenantFeaturesUpdatedPayload
 */

export const TenantFeaturesUpdatedPayloadCheck = TypeCompiler.Compile(
  TenantFeaturesUpdatedPayloadSchema,
);

/**
 * @param {TenantFeaturesUpdatedPayload} payload
 * @returns {{
 *   payload: TenantFeaturesUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 * }}
 */
export function buildTenantFeaturesUpdatedEvent(payload) {
  if (!TenantFeaturesUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    payload,
    schema_version: TenantFeaturesUpdatedSchemaVersion,
    subject: TenantFeaturesUpdatedSubject,
  };
}

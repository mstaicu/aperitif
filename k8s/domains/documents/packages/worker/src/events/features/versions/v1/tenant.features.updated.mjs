import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import {
  TenantEventResourceSchema,
  TenantFeatureEventResourceSchema,
} from "./resources.mjs";

export const TenantFeaturesUpdatedSubject = "features.tenant_features.updated";

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

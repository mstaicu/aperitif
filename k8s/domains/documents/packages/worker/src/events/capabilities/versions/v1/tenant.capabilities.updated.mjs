import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import {
  TenantCapabilityEventResourceSchema,
  TenantEventResourceSchema,
} from "./resources.mjs";

export const TenantCapabilitiesUpdatedSubject =
  "capabilities.tenant_capabilities.updated";

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

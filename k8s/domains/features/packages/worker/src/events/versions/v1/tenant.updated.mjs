import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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

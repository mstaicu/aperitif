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

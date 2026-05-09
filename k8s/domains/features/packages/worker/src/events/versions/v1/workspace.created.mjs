import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantEventResourceSchema,
  WorkspaceEventResourceSchema,
} from "./resources.mjs";

export const WorkspaceCreatedSubject = "tenancy.workspace.created";
export const WorkspaceCreatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

export const WorkspaceCreatedPayloadSchema = Type.Object(
  {
    tenant: TenantEventResourceSchema,
    workspace: WorkspaceEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof WorkspaceCreatedPayloadSchema
 * >} WorkspaceCreatedPayload
 */

export const WorkspaceCreatedPayloadCheck = TypeCompiler.Compile(
  WorkspaceCreatedPayloadSchema,
);

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import {
  TenantEventResourceSchema,
  WorkspaceEventResourceSchema,
} from "./resources.mjs";

export const WorkspaceUpdatedSubject = "tenancy.workspace.updated";

export const WorkspaceUpdatedPayloadSchema = Type.Object(
  {
    tenant: TenantEventResourceSchema,
    workspace: WorkspaceEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof WorkspaceUpdatedPayloadSchema
 * >} WorkspaceUpdatedPayload
 */

export const WorkspaceUpdatedPayloadCheck = TypeCompiler.Compile(
  WorkspaceUpdatedPayloadSchema,
);

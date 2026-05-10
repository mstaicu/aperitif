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

/**
 * @param {WorkspaceCreatedPayload} payload
 * @returns {{
 *   payload: WorkspaceCreatedPayload,
 *   schema_version: number,
 *   subject: string,
 * }}
 */
export function buildWorkspaceCreatedEvent(payload) {
  if (!WorkspaceCreatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    payload,
    schema_version: WorkspaceCreatedSchemaVersion,
    subject: WorkspaceCreatedSubject,
  };
}

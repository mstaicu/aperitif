import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  TenantEventResourceSchema,
  WorkspaceEventResourceSchema,
} from "./resources.mjs";

export const WorkspaceUpdatedSubject = "tenancy.workspace.updated";
export const WorkspaceUpdatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

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

/**
 * @param {WorkspaceUpdatedPayload} payload
 * @param {number} version
 * @returns {{
 *   id: string,
 *   payload: WorkspaceUpdatedPayload,
 *   schema_version: number,
 *   subject: string,
 *   version: number,
 * }}
 */
export function buildWorkspaceUpdatedEvent(payload, version) {
  if (!WorkspaceUpdatedPayloadCheck.Check(payload)) {
    throw new Error("INVALID_EVENT_PAYLOAD");
  }

  return {
    id: randomUUID(),
    payload,
    schema_version: WorkspaceUpdatedSchemaVersion,
    subject: WorkspaceUpdatedSubject,
    version,
  };
}

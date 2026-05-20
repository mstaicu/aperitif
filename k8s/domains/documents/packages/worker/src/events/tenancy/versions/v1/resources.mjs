import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const TenantRoleSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("member"),
]);

export const TenantEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
  },
  { additionalProperties: false },
);

export const WorkspaceEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
    tenant_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof TenantEventResourceSchema
 * >} TenantEventResource
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof WorkspaceEventResourceSchema
 * >} WorkspaceEventResource
 */

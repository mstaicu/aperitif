import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const TenantEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
  },
  { additionalProperties: false },
);

export const TenantFeatureEventResourceSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    value: Type.Unknown(),
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
 *   typeof TenantFeatureEventResourceSchema
 * >} TenantFeatureEventResource
 */

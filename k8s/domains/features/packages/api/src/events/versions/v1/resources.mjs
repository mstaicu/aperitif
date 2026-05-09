import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const FeatureValueTypeSchema = Type.Union([
  Type.Literal("boolean"),
  Type.Literal("number"),
  Type.Literal("string"),
  Type.Literal("json"),
]);

export const TenantEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
  },
  { additionalProperties: false },
);

export const TenantFeatureEventResourceSchema = Type.Object(
  {
    key: Type.String({ minLength: 1 }),
    value: Type.Unknown(),
    value_type: FeatureValueTypeSchema,
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

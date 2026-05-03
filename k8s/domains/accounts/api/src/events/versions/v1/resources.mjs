import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const AccountKindSchema = Type.Union([
  Type.Literal("personal"),
  Type.Literal("organization"),
]);

export const AccountStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("active"),
]);

export const AccountRoleSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("member"),
]);

export const AccountEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
    kind: AccountKindSchema,
    name: Type.String({ maxLength: 160, minLength: 1 }),
    status: AccountStatusSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEventResourceSchema
 * >} AccountEventResource
 */

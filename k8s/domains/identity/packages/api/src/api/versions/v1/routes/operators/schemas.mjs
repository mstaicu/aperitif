import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{12}$",
});

export const OperatorRoleParams = Type.Object(
  {
    role_id: Type.String({ minLength: 1 }),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const OperatorRoleResponse = Type.Object(
  {
    role_id: Type.String({ minLength: 1 }),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

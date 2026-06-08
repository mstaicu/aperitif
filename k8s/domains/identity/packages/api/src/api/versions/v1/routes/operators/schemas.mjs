import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{12}$",
});

export const OperatorParams = Type.Object(
  {
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const OperatorResponse = Type.Object(
  {
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

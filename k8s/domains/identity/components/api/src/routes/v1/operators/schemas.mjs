import { Type } from "@fastify/type-provider-typebox";

export const UuidSchema = Type.String({
  format: "uuid",
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

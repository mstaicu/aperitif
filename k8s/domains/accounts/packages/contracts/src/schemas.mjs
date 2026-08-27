import { Type } from "@sinclair/typebox";

export const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

export const AccountMemberSchema = Type.Object(
  {
    role: Type.Union([Type.Literal("owner"), Type.Literal("member")]),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

export const AccountSchema = Type.Object(
  {
    id: UuidSchema,
    members: Type.Array(AccountMemberSchema, { minItems: 1 }),
    name: Type.String({ maxLength: 160, minLength: 1 }),
    type: Type.Union([
      Type.Literal("individual"),
      Type.Literal("organization"),
    ]),
  },
  { additionalProperties: false },
);

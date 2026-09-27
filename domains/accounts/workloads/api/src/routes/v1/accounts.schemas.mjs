import { Type } from "@fastify/type-provider-typebox";

const AccountName = Type.String({
  description: "Human-readable account name.",
  maxLength: 160,
  minLength: 1,
});
export const CreateAccountBody = Type.Object(
  {
    name: AccountName,
  },
  {
    additionalProperties: false,
    description: "Payload for creating an account owned by the caller.",
  },
);

export const Account = Type.Object(
  {
    created_at: Type.String({
      description: "Time when the account was created.",
      format: "date-time",
    }),
    id: Type.String({
      description: "Stable identifier for an account resource.",
      format: "uuid",
    }),
    name: AccountName,
    role: Type.String({
      description: "The authenticated caller's membership role.",
      enum: ["owner", "admin", "member"],
    }),
  },
  {
    additionalProperties: false,
    description: "Account visible to the authenticated caller.",
  },
);

export const AccountsResponse = Type.Object(
  {
    accounts: Type.Array(Account),
  },
  {
    additionalProperties: false,
    description: "Accounts visible to the authenticated caller.",
  },
);

export const CreateAccountResponse = Type.Object(
  {
    account: Account,
  },
  {
    additionalProperties: false,
    description: "Created account.",
  },
);

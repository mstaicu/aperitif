import { Type } from "@fastify/type-provider-typebox";

const AccountId = Type.String({
  description: "Stable identifier for an account resource.",
  format: "uuid",
});
const AccountName = Type.String({
  description: "Human-readable account name.",
  maxLength: 160,
  minLength: 1,
});
const AccountType = Type.Union(
  [Type.Literal("personal"), Type.Literal("business")],
  {
    description:
      "Kind of account boundary being created. Personal accounts represent an individual context. Business accounts represent an organization context.",
  },
);

export const CreateAccountBody = Type.Object(
  {
    name: AccountName,
    type: AccountType,
  },
  {
    additionalProperties: false,
    description: "Payload for creating an account owned by the caller.",
  },
);

export const Account = Type.Object(
  {
    id: AccountId,
    name: AccountName,
    type: AccountType,
  },
  {
    additionalProperties: false,
    description:
      "Account resource. Accounts are the authority root for account-scoped access.",
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

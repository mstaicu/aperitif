import { Type } from "@sinclair/typebox";

const AccountId = Type.String({
  description: "Stable identifier for a account resource.",
  format: "uuid",
});
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
    description: "Payload for creating a account owned by the caller.",
  },
);

export const Account = Type.Object(
  {
    id: AccountId,
    name: AccountName,
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

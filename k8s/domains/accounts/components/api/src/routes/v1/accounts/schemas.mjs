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
  [Type.Literal("personal"), Type.Literal("organization")],
  {
    description:
      "Kind of account boundary being created. Personal accounts represent an individual context. Organization accounts represent a shared organizational context.",
  },
);
const MemberRole = Type.Union([Type.Literal("owner"), Type.Literal("member")], {
  description:
    "Account-level authority. Product-specific roles belong to product domains.",
});
const UserId = Type.String({
  description: "Stable identifier for an authenticated user.",
  format: "uuid",
});

export const AccountParams = Type.Object(
  {
    account_id: AccountId,
  },
  { additionalProperties: false },
);

export const AccountMemberParams = Type.Object(
  {
    account_id: AccountId,
    user_id: UserId,
  },
  { additionalProperties: false },
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

export const CreateMemberBody = Type.Object(
  {
    role: MemberRole,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "Existing user to add to the account.",
  },
);

export const UpdateMemberBody = Type.Object(
  {
    role: MemberRole,
  },
  {
    additionalProperties: false,
    description: "New account-level role for an existing member.",
  },
);

export const Member = Type.Object(
  {
    role: MemberRole,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description: "A user's membership in an account.",
  },
);

export const MemberResponse = Type.Object(
  {
    member: Member,
  },
  {
    additionalProperties: false,
    description: "Account membership.",
  },
);

export const MembersResponse = Type.Object(
  {
    members: Type.Array(Member),
  },
  {
    additionalProperties: false,
    description: "Members of an account.",
  },
);

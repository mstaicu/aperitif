import { Type } from "@sinclair/typebox";

const AccountId = Type.String({
  description: "Stable identifier for an account resource.",
  format: "uuid",
});
const AccountRequirementId = Type.String({
  description: "Stable identifier for an account requirement row.",
  format: "uuid",
});
const UserId = Type.String({
  description: "Stable identifier for a global user identity.",
  format: "uuid",
});
const AccountName = Type.String({
  description: "Human-readable account name.",
  maxLength: 160,
  minLength: 1,
});
const RequirementType = Type.String({
  description:
    "Requirement type tracked for account activation, such as terms, billing_setup, or identity_verification.",
  maxLength: 128,
  minLength: 1,
});

export const AccountKind = Type.Union(
  [Type.Literal("personal"), Type.Literal("organization")],
  {
    description:
      "Account ownership shape. Personal accounts support individual use cases; organization accounts support business use cases.",
  },
);

export const AccountRole = Type.Union(
  [Type.Literal("owner"), Type.Literal("member")],
  {
    description: "Account role inside the account authority boundary.",
  },
);

export const AccountStatus = Type.Union(
  [Type.Literal("pending"), Type.Literal("active")],
  {
    description:
      "Account lifecycle status. Activation requirements move an account from pending to active.",
  },
);

const AccountRequirementStatus = Type.Union([
  Type.Literal("pending"),
  Type.Literal("completed"),
]);

export const AccountParams = Type.Object(
  {
    accountId: AccountId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a single account resource.",
  },
);

export const AccountMembershipParams = Type.Object(
  {
    accountId: AccountId,
    userId: UserId,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a specific account membership.",
  },
);

export const CreateAccountBody = Type.Object(
  {
    kind: AccountKind,
    name: AccountName,
  },
  {
    additionalProperties: false,
    description: "Payload for creating an account owned by the caller.",
  },
);

export const Account = Type.Object(
  {
    id: AccountId,
    kind: AccountKind,
    name: AccountName,
    status: AccountStatus,
  },
  {
    additionalProperties: false,
    description:
      "Account resource. Accounts are the authority root for account-scoped product access.",
  },
);

export const AccountRequirement = Type.Object(
  {
    id: AccountRequirementId,
    status: AccountRequirementStatus,
    type: RequirementType,
  },
  {
    additionalProperties: false,
    description:
      "Requirement row tracked against account activation. Other domains fulfill these requirement types; accounts tracks their status.",
  },
);

export const AccountMembership = Type.Object(
  {
    account_id: AccountId,
    role: AccountRole,
    user_id: UserId,
  },
  {
    additionalProperties: false,
    description:
      "Membership linking a user identity to an account control plane.",
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

export const AccountResponse = Type.Object(
  {
    account: Account,
  },
  {
    additionalProperties: false,
    description: "Single account resource.",
  },
);

export const AccountRequirementsResponse = Type.Object(
  {
    requirements: Type.Array(AccountRequirement),
  },
  {
    additionalProperties: false,
    description: "Current activation requirements for an account.",
  },
);

export const AccountMembershipsResponse = Type.Object(
  {
    memberships: Type.Array(AccountMembership),
  },
  {
    additionalProperties: false,
    description: "Memberships attached to an account.",
  },
);

export const AccountMembershipResponse = Type.Object(
  {
    membership: AccountMembership,
  },
  {
    additionalProperties: false,
    description: "Specific account membership.",
  },
);

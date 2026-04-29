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
const Count = Type.Integer({
  description: "Number of items returned in this response.",
  minimum: 0,
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
      "Account ownership shape. Personal accounts can stay hidden in consumer UX; organization accounts are tenant/customer accounts.",
  },
);

export const AccountRole = Type.Union(
  [Type.Literal("owner"), Type.Literal("member")],
  {
    description:
      "Account role. Account authority is tenant/customer control-plane authority.",
  },
);

export const AccountStatus = Type.Union(
  [
    Type.Literal("pending_activation"),
    Type.Literal("active"),
    Type.Literal("suspended"),
    Type.Literal("closed"),
  ],
  {
    description:
      "Account lifecycle status. Activation requirements move an account from pending_activation to active.",
  },
);

const AccountRequirementStatus = Type.Union([
  Type.Literal("pending"),
  Type.Literal("completed"),
  Type.Literal("failed"),
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

export const AccountRequirementParams = Type.Object(
  {
    accountId: AccountId,
    type: RequirementType,
  },
  {
    additionalProperties: false,
    description: "Path parameters for a specific account requirement type.",
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

export const CreateAccountMembershipBody = Type.Object(
  {
    role: AccountRole,
  },
  {
    additionalProperties: false,
    description: "Payload for adding a user to an account.",
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
      "Account resource. Accounts are the tenant/customer ownership root and can be the only authority context for account-only products.",
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

export const AccountAccess = Type.Object(
  {
    account: Account,
    membership: AccountMembership,
  },
  {
    additionalProperties: false,
    description: "Account plus the caller membership in that account.",
  },
);

export const AccountsResponse = Type.Object(
  {
    accounts: Type.Array(AccountAccess),
    count: Count,
  },
  {
    additionalProperties: false,
    description: "Accounts visible to the authenticated caller.",
  },
);

export const AccountResponse = Type.Object(
  {
    account: Account,
    membership: AccountMembership,
    requirements: Type.Array(AccountRequirement),
  },
  {
    additionalProperties: false,
    description:
      "Single account plus the caller membership and activation requirements.",
  },
);

export const AccountRequirementsResponse = Type.Object(
  {
    account: Account,
    requirements: Type.Array(AccountRequirement),
  },
  {
    additionalProperties: false,
    description: "Current activation requirements for an account.",
  },
);

export const AccountMembershipsResponse = Type.Object(
  {
    account: Account,
    count: Count,
    memberships: Type.Array(AccountMembership),
  },
  {
    additionalProperties: false,
    description: "Memberships attached to an account.",
  },
);

export const AccountMembershipResponse = Type.Object(
  {
    account: Account,
    membership: AccountMembership,
  },
  {
    additionalProperties: false,
    description: "Created or fetched membership for a specific account.",
  },
);

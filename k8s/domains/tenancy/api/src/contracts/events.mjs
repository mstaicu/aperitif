import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

export const TENANCY_ACCOUNT_CREATED = "tenancy.account.created";
export const TENANCY_ACCOUNT_UPDATED = "tenancy.account.updated";
export const TENANCY_ACCOUNT_MEMBERSHIP_CREATED =
  "tenancy.account_membership.created";
export const TENANCY_ACCOUNT_MEMBERSHIP_DELETED =
  "tenancy.account_membership.deleted";
export const TENANCY_ACCOUNT_REQUIREMENT_COMPLETED =
  "tenancy.account_requirement.completed";

const AccountKindSchema = Type.Union([
  Type.Literal("personal"),
  Type.Literal("organization"),
]);

const AccountStatusSchema = Type.Union([
  Type.Literal("pending"),
  Type.Literal("active"),
]);

const AccountRoleSchema = Type.Union([
  Type.Literal("owner"),
  Type.Literal("member"),
]);

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountEventResourceSchema = Type.Object(
  {
    id: UuidSchema,
    kind: AccountKindSchema,
    name: Type.String({ maxLength: 160, minLength: 1 }),
    status: AccountStatusSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEventResourceSchema
 * >} AccountEventResource
 */

export const AccountCreatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountCreatedPayloadSchema
 * >} AccountCreatedPayload
 */

export const AccountUpdatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountUpdatedPayloadSchema
 * >} AccountUpdatedPayload
 */

const AccountMembershipCreatedEventResourceSchema = Type.Object(
  {
    account_id: UuidSchema,
    role: AccountRoleSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMembershipCreatedEventResourceSchema
 * >} AccountMembershipCreatedEventResource
 */

export const AccountMembershipCreatedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    membership: AccountMembershipCreatedEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMembershipCreatedPayloadSchema
 * >} AccountMembershipCreatedPayload
 */

const AccountMembershipDeletedEventResourceSchema = Type.Object(
  {
    account_id: UuidSchema,
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMembershipDeletedEventResourceSchema
 * >} AccountMembershipDeletedEventResource
 */

export const AccountMembershipDeletedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    membership: AccountMembershipDeletedEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMembershipDeletedPayloadSchema
 * >} AccountMembershipDeletedPayload
 */

const AccountRequirementCompletedEventResourceSchema = Type.Object(
  {
    account_id: UuidSchema,
    status: Type.Literal("completed"),
    type: Type.String({ maxLength: 128, minLength: 1 }),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountRequirementCompletedEventResourceSchema
 * >} AccountRequirementCompletedEventResource
 */

export const AccountRequirementCompletedPayloadSchema = Type.Object(
  {
    account: AccountEventResourceSchema,
    requirement: AccountRequirementCompletedEventResourceSchema,
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountRequirementCompletedPayloadSchema
 * >} AccountRequirementCompletedPayload
 */

export const AccountCreatedPayloadCheck = TypeCompiler.Compile(
  AccountCreatedPayloadSchema,
);

export const AccountUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountUpdatedPayloadSchema,
);

export const AccountMembershipCreatedPayloadCheck = TypeCompiler.Compile(
  AccountMembershipCreatedPayloadSchema,
);

export const AccountMembershipDeletedPayloadCheck = TypeCompiler.Compile(
  AccountMembershipDeletedPayloadSchema,
);

export const AccountRequirementCompletedPayloadCheck = TypeCompiler.Compile(
  AccountRequirementCompletedPayloadSchema,
);

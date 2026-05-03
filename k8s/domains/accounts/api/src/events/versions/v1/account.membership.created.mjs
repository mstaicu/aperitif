import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { ACCOUNTS_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import {
  AccountEventResourceSchema,
  AccountRoleSchema,
  UuidSchema,
} from "./resources.mjs";

export const AccountMembershipCreatedSubject =
  "accounts.account_membership.created";
export const AccountMembershipCreatedSchemaVersion =
  ACCOUNTS_EVENT_SCHEMA_VERSION;

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

export const AccountMembershipCreatedPayloadCheck = TypeCompiler.Compile(
  AccountMembershipCreatedPayloadSchema,
);

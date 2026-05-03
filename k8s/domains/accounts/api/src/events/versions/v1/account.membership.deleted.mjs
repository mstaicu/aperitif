import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { ACCOUNTS_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { AccountEventResourceSchema, UuidSchema } from "./resources.mjs";

export const AccountMembershipDeletedSubject =
  "accounts.account_membership.deleted";
export const AccountMembershipDeletedSchemaVersion =
  ACCOUNTS_EVENT_SCHEMA_VERSION;

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

export const AccountMembershipDeletedPayloadCheck = TypeCompiler.Compile(
  AccountMembershipDeletedPayloadSchema,
);

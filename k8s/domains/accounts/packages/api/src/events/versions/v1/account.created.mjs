import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { ACCOUNTS_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { AccountEventResourceSchema } from "./resources.mjs";

export const AccountCreatedSubject = "accounts.account.created";
export const AccountCreatedSchemaVersion = ACCOUNTS_EVENT_SCHEMA_VERSION;

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

export const AccountCreatedPayloadCheck = TypeCompiler.Compile(
  AccountCreatedPayloadSchema,
);

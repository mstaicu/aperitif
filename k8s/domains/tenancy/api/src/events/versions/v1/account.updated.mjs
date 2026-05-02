import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { AccountEventResourceSchema } from "./resources.mjs";

export const AccountUpdatedSubject = "tenancy.account.updated";
export const AccountUpdatedSchemaVersion = TENANCY_EVENT_SCHEMA_VERSION;

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

export const AccountUpdatedPayloadCheck = TypeCompiler.Compile(
  AccountUpdatedPayloadSchema,
);

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TENANCY_EVENT_SCHEMA_VERSION } from "./envelope.mjs";
import { AccountEventResourceSchema, UuidSchema } from "./resources.mjs";

export const AccountRequirementCompletedSubject =
  "tenancy.account_requirement.completed";
export const AccountRequirementCompletedSchemaVersion =
  TENANCY_EVENT_SCHEMA_VERSION;

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

export const AccountRequirementCompletedPayloadCheck = TypeCompiler.Compile(
  AccountRequirementCompletedPayloadSchema,
);

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountCreatedV1Source = "/domains/accounts";
export const AccountCreatedV1Type = "accounts.account.created.v1";

export const AccountCreatedV1DataSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
        name: Type.String({ maxLength: 160, minLength: 1 }),
        type: Type.Union([Type.Literal("personal"), Type.Literal("business")]),
      },
      { additionalProperties: false },
    ),
    member: Type.Object(
      {
        role: Type.Literal("owner"),
        user_id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountCreatedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountCreatedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountCreatedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountCreatedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountCreatedV1DataSchema
 * >} AccountCreatedV1Data
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountCreatedV1EventSchema
 * >} AccountCreatedV1Event
 */

export const AccountCreatedV1EventCheck = TypeCompiler.Compile(
  AccountCreatedV1EventSchema,
);

/**
 * @param {Omit<AccountCreatedV1Data, "version">} data
 * @param {number} version
 * @returns {AccountCreatedV1Event}
 */
export function buildAccountCreatedV1Event(data, version) {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    data: {
      ...data,
      version,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: AccountCreatedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountCreatedV1Type,
  };
}

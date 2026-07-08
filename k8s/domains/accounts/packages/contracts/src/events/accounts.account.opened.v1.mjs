import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountOpenedV1Source = "/domains/accounts";
export const AccountOpenedV1Type = "accounts.account.opened.v1";

export const AccountOpenedV1DataSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
        type: Type.Union([Type.Literal("personal"), Type.Literal("business")]),
      },
      { additionalProperties: false },
    ),
    member: Type.Object(
      {
        role: Type.String({ minLength: 1 }),
        user_id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountOpenedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountOpenedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountOpenedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountOpenedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedV1DataSchema
 * >} AccountOpenedV1Data
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedV1EventSchema
 * >} AccountOpenedV1Event
 */

export const AccountOpenedV1EventCheck = TypeCompiler.Compile(
  AccountOpenedV1EventSchema,
);

/**
 * @param {Omit<AccountOpenedV1Data, "version">} data
 * @param {number} version
 * @returns {AccountOpenedV1Event}
 */
export function buildAccountOpenedV1Event(data, version) {
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
    source: AccountOpenedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountOpenedV1Type,
  };
}

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountOpenedSource = "/domains/accounts";
export const AccountOpenedType = "accounts.account.opened.v1";

export const AccountOpenedDataSchema = Type.Object(
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

export const AccountOpenedEventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountOpenedDataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountOpenedSource),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountOpenedType),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedDataSchema
 * >} AccountOpenedData
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountOpenedEventSchema
 * >} AccountOpenedEvent
 */

export const AccountOpenedEventCheck = TypeCompiler.Compile(
  AccountOpenedEventSchema,
);

/**
 * @param {Omit<AccountOpenedData, "version">} data
 * @param {number} version
 * @returns {AccountOpenedEvent}
 */
export function buildAccountOpenedEvent(data, version) {
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
    source: AccountOpenedSource,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountOpenedType,
  };
}

import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { AccountMemberSchema, UuidSchema } from "../schemas.mjs";

export const AccountMemberUpdatedV1Source = "/domains/accounts";
export const AccountMemberUpdatedV1Type = "accounts.member.updated.v1";

export const AccountMemberUpdatedV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    member: AccountMemberSchema,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountMemberUpdatedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountMemberUpdatedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountMemberUpdatedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountMemberUpdatedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMemberUpdatedV1EventSchema
 * >} AccountMemberUpdatedV1Event
 */

export const AccountMemberUpdatedV1EventCheck = TypeCompiler.Compile(
  AccountMemberUpdatedV1EventSchema,
);

/**
 * @param {Omit<AccountMemberUpdatedV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountMemberUpdatedV1Event}
 */
export function buildAccountMemberUpdatedV1Event(data, version) {
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
    source: AccountMemberUpdatedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountMemberUpdatedV1Type,
  };
}

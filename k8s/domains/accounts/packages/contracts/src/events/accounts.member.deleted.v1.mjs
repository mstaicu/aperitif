import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { AccountMemberSchema, UuidSchema } from "../schemas.mjs";

export const AccountMemberDeletedV1Source = "/domains/accounts";
export const AccountMemberDeletedV1Type = "accounts.member.deleted.v1";

export const AccountMemberDeletedV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    member: AccountMemberSchema,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountMemberDeletedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountMemberDeletedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountMemberDeletedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountMemberDeletedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMemberDeletedV1EventSchema
 * >} AccountMemberDeletedV1Event
 */

export const AccountMemberDeletedV1EventCheck = TypeCompiler.Compile(
  AccountMemberDeletedV1EventSchema,
);

/**
 * @param {Omit<AccountMemberDeletedV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountMemberDeletedV1Event}
 */
export function buildAccountMemberDeletedV1Event(data, version) {
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
    source: AccountMemberDeletedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountMemberDeletedV1Type,
  };
}

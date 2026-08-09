import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { AccountMemberSchema, UuidSchema } from "../schemas.mjs";

export const AccountMemberCreatedV1Source = "/domains/accounts";
export const AccountMemberCreatedV1Type = "accounts.member.created.v1";

export const AccountMemberCreatedV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    member: AccountMemberSchema,
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountMemberCreatedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountMemberCreatedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountMemberCreatedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountMemberCreatedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountMemberCreatedV1EventSchema
 * >} AccountMemberCreatedV1Event
 */

export const AccountMemberCreatedV1EventCheck = TypeCompiler.Compile(
  AccountMemberCreatedV1EventSchema,
);

/**
 * @param {Omit<AccountMemberCreatedV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountMemberCreatedV1Event}
 */
export function buildAccountMemberCreatedV1Event(data, version) {
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
    source: AccountMemberCreatedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountMemberCreatedV1Type,
  };
}

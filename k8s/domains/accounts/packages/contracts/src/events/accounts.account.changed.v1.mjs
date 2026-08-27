import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { AccountSchema, UuidSchema } from "../schemas.mjs";

export const AccountChangedV1Source = "/domains/accounts";
export const AccountChangedV1Type = "accounts.account.changed.v1";
export const AccountV1SubjectPrefix = "accounts.account.v1";

const UuidCheck = TypeCompiler.Compile(UuidSchema);

export const AccountChangedV1DataSchema = Type.Object(
  {
    account: Type.Union([AccountSchema, Type.Null()]),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountChangedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountChangedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountChangedV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountChangedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountChangedV1EventSchema
 * >} AccountChangedV1Event
 */

const AccountChangedV1EventSchemaCheck = TypeCompiler.Compile(
  AccountChangedV1EventSchema,
);

export const AccountChangedV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!AccountChangedV1EventSchemaCheck.Check(event)) {
      return false;
    }

    return (
      event.data.account === null ||
      event.subject === `account/${event.data.account.id}`
    );
  },
};

/**
 * @param {string} accountId
 */
export function buildAccountV1Subject(accountId) {
  if (!UuidCheck.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountV1SubjectPrefix}.${accountId}`;
}

/**
 * @param {{ account: AccountChangedV1Event["data"]["account"], accountId: string }} data
 * @param {number} version
 * @returns {AccountChangedV1Event}
 */
export function buildAccountChangedV1Event({ account, accountId }, version) {
  if (!UuidCheck.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  if (account !== null && account.id !== accountId) {
    throw new Error("ACCOUNT_ID_MISMATCH");
  }

  if (!Number.isInteger(version) || version < 1) {
    throw new Error("INVALID_EVENT_VERSION");
  }

  return {
    data: {
      account,
      version,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: AccountChangedV1Source,
    specversion: "1.0",
    subject: `account/${accountId}`,
    time: new Date().toISOString(),
    type: AccountChangedV1Type,
  };
}

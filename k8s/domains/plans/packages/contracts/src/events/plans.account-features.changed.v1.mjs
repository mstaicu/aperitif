import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountFeaturesChangedV1Source = "/domains/plans";
export const AccountFeaturesChangedV1Type = "plans.account-features.changed.v1";
export const AccountFeaturesV1SubjectPrefix = "plans.account-features.v1";

const UuidCheck = TypeCompiler.Compile(UuidSchema);

export const AccountFeaturesChangedV1DataSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    features: Type.Record(
      Type.String({ minLength: 1 }),
      Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
    ),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountFeaturesChangedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountFeaturesChangedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountFeaturesChangedV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountFeaturesChangedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountFeaturesChangedV1EventSchema
 * >} AccountFeaturesChangedV1Event
 */

const AccountFeaturesChangedV1EventSchemaCheck = TypeCompiler.Compile(
  AccountFeaturesChangedV1EventSchema,
);

export const AccountFeaturesChangedV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!AccountFeaturesChangedV1EventSchemaCheck.Check(event)) {
      return false;
    }

    return event.subject === `account/${event.data.account.id}`;
  },
};

/**
 * @param {string} accountId
 */
export function buildAccountFeaturesV1Subject(accountId) {
  if (!UuidCheck.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountFeaturesV1SubjectPrefix}.${accountId}`;
}

/**
 * @param {Omit<AccountFeaturesChangedV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountFeaturesChangedV1Event}
 */
export function buildAccountFeaturesChangedV1Event(data, version) {
  if (!UuidCheck.Check(data.account.id)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

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
    source: AccountFeaturesChangedV1Source,
    specversion: "1.0",
    subject: `account/${data.account.id}`,
    time: new Date().toISOString(),
    type: AccountFeaturesChangedV1Type,
  };
}

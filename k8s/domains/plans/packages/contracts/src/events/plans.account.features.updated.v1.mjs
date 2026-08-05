import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountFeaturesUpdatedV1Source = "/domains/plans";
export const AccountFeaturesUpdatedV1Type = "plans.account.features.updated.v1";

export const AccountFeaturesUpdatedV1DataSchema = Type.Object(
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

export const AccountFeaturesUpdatedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountFeaturesUpdatedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountFeaturesUpdatedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountFeaturesUpdatedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountFeaturesUpdatedV1EventSchema
 * >} AccountFeaturesUpdatedV1Event
 */

export const AccountFeaturesUpdatedV1EventCheck = TypeCompiler.Compile(
  AccountFeaturesUpdatedV1EventSchema,
);

/**
 * @param {Omit<AccountFeaturesUpdatedV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountFeaturesUpdatedV1Event}
 */
export function buildAccountFeaturesUpdatedV1Event(data, version) {
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
    source: AccountFeaturesUpdatedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountFeaturesUpdatedV1Type,
  };
}

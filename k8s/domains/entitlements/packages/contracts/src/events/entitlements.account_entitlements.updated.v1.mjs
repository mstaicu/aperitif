import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountEntitlementsUpdatedV1Source = "/domains/entitlements";
export const AccountEntitlementsUpdatedV1Type =
  "entitlements.account_entitlements.updated.v1";

export const AccountEntitlementsUpdatedV1DataSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
      },
      { additionalProperties: false },
    ),
    entitlements: Type.Array(
      Type.Object(
        {
          id: Type.String({ minLength: 1 }),
          value: Type.Union([Type.Boolean(), Type.Number()]),
        },
        { additionalProperties: false },
      ),
    ),
    version: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountEntitlementsUpdatedV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountEntitlementsUpdatedV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountEntitlementsUpdatedV1Source),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountEntitlementsUpdatedV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedV1DataSchema
 * >} AccountEntitlementsUpdatedV1Data
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedV1EventSchema
 * >} AccountEntitlementsUpdatedV1Event
 */

export const AccountEntitlementsUpdatedV1EventCheck = TypeCompiler.Compile(
  AccountEntitlementsUpdatedV1EventSchema,
);

/**
 * @param {Omit<AccountEntitlementsUpdatedV1Data, "version">} data
 * @param {number} version
 * @returns {AccountEntitlementsUpdatedV1Event}
 */
export function buildAccountEntitlementsUpdatedV1Event(data, version) {
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
    source: AccountEntitlementsUpdatedV1Source,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountEntitlementsUpdatedV1Type,
  };
}

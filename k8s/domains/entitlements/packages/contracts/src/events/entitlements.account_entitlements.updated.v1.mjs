import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

import { UuidSchema } from "../schemas.mjs";

export const AccountEntitlementsUpdatedSource = "/domains/entitlements";
export const AccountEntitlementsUpdatedType =
  "entitlements.account_entitlements.updated.v1";

export const AccountEntitlementsUpdatedDataSchema = Type.Object(
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

export const AccountEntitlementsUpdatedEventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountEntitlementsUpdatedDataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountEntitlementsUpdatedSource),
    specversion: Type.Literal("1.0"),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountEntitlementsUpdatedType),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedDataSchema
 * >} AccountEntitlementsUpdatedData
 */

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountEntitlementsUpdatedEventSchema
 * >} AccountEntitlementsUpdatedEvent
 */

export const AccountEntitlementsUpdatedEventCheck = TypeCompiler.Compile(
  AccountEntitlementsUpdatedEventSchema,
);

/**
 * @param {Omit<AccountEntitlementsUpdatedData, "version">} data
 * @param {number} version
 * @returns {AccountEntitlementsUpdatedEvent}
 */
export function buildAccountEntitlementsUpdatedEvent(data, version) {
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
    source: AccountEntitlementsUpdatedSource,
    specversion: "1.0",
    time: new Date().toISOString(),
    type: AccountEntitlementsUpdatedType,
  };
}

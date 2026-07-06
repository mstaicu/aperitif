import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

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

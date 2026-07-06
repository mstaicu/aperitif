import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { UuidSchema } from "../schemas.mjs";

export const AccountOpenedSource = "/domains/accounts";
export const AccountOpenedType = "accounts.account.opened.v1";

export const AccountOpenedDataSchema = Type.Object(
  {
    account: Type.Object(
      {
        id: UuidSchema,
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

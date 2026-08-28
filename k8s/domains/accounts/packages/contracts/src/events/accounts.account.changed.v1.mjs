import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const AccountChangedV1Source = "/domains/accounts";
export const AccountChangedV1Type = "accounts.account.changed.v1";
export const AccountV1SubjectPrefix = "accounts.account.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountMemberSchema = Type.Object(
  {
    role: Type.Union([Type.Literal("owner"), Type.Literal("member")]),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

const UuidCheck = TypeCompiler.Compile(UuidSchema);

export const AccountChangedV1DataSchema = Type.Object(
  {
    id: UuidSchema,
    members: Type.Array(AccountMemberSchema, { minItems: 1 }),
    name: Type.String({ maxLength: 160, minLength: 1 }),
    type: Type.Union([
      Type.Literal("individual"),
      Type.Literal("organization"),
    ]),
    revision: Type.Integer({ minimum: 1 }),
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

    return event.subject === `account/${event.data.id}`;
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
 * @param {Omit<AccountChangedV1Event["data"], "revision">} data
 * @param {number} revision
 * @returns {AccountChangedV1Event}
 */
export function buildAccountChangedV1Event(data, revision) {
  const event = {
    data: {
      ...data,
      revision,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: AccountChangedV1Source,
    specversion: "1.0",
    subject: `account/${data.id}`,
    time: new Date().toISOString(),
    type: AccountChangedV1Type,
  };

  if (!AccountChangedV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_CHANGED_EVENT");
  }

  return event;
}

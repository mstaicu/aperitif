import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const AccountSnapshotV1Source = "/domains/accounts";
export const AccountSnapshotV1Type = "accounts.account.snapshot.v1";
export const AccountV1SubjectPrefix = "accounts.account.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountMemberSchema = Type.Object(
  {
    roles: Type.Array(
      Type.Literal("owner"),
      { uniqueItems: true },
    ),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

const UuidCheck = TypeCompiler.Compile(UuidSchema);

export const AccountSnapshotV1DataSchema = Type.Object(
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

export const AccountSnapshotV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountSnapshotV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountSnapshotV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountSnapshotV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountSnapshotV1EventSchema
 * >} AccountSnapshotV1Event
 */

const AccountSnapshotV1EventSchemaCheck = TypeCompiler.Compile(
  AccountSnapshotV1EventSchema,
);

export const AccountSnapshotV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!AccountSnapshotV1EventSchemaCheck.Check(event)) {
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
 * @param {Omit<AccountSnapshotV1Event["data"], "revision">} data
 * @param {number} revision
 * @returns {AccountSnapshotV1Event}
 */
export function buildAccountSnapshotV1Event(data, revision) {
  const event = {
    data: {
      ...data,
      revision,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: AccountSnapshotV1Source,
    specversion: "1.0",
    subject: `account/${data.id}`,
    time: new Date().toISOString(),
    type: AccountSnapshotV1Type,
  };

  if (!AccountSnapshotV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_SNAPSHOT_EVENT");
  }

  return event;
}

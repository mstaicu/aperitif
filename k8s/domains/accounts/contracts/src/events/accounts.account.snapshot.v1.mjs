import { Type } from "@sinclair/typebox";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { randomUUID } from "node:crypto";

export const AccountSnapshotV1Source = "/domains/accounts";
export const AccountSnapshotV1Type = "accounts.account.snapshot.v1";
export const AccountV1SubjectPrefix = "accounts.account.v1";

const ajv = new Ajv();
addFormats(ajv);

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

const checkUuid = ajv.compile(UuidSchema);

export const AccountSnapshotV1DataSchema = Type.Object(
  {
    id: UuidSchema,
    members: Type.Array(AccountMemberSchema, { minItems: 1 }),
    name: Type.String({ maxLength: 160, minLength: 1 }),
    type: Type.Union([
      Type.Literal("individual"),
      Type.Literal("organization"),
    ]),
    version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export const AccountSnapshotV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountSnapshotV1DataSchema,
    dataschema: Type.Optional(Type.String({ format: "uri" })),
    id: UuidSchema,
    source: Type.Literal(AccountSnapshotV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ format: "date-time" }),
    traceparent: Type.Optional(Type.String({ minLength: 1 })),
    tracestate: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Literal(AccountSnapshotV1Type),
  },
  {
    // CloudEvents integer metadata is 32-bit; data.version is separate.
    propertyNames: { pattern: "^[a-z0-9]+$" },
    dependencies: { tracestate: ["traceparent"] },
    additionalProperties: Type.Union([
      Type.String(),
      Type.Boolean(),
      Type.Integer({ minimum: -2147483648, maximum: 2147483647 }),
    ]),
  },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountSnapshotV1EventSchema
 * >} AccountSnapshotV1Event
 */

const checkAccountSnapshotV1Event = ajv.compile(AccountSnapshotV1EventSchema);

export const AccountSnapshotV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!checkAccountSnapshotV1Event(event)) {
      return false;
    }

    return event.subject === `account/${event.data.id}`;
  },
};

/**
 * @param {string} accountId
 */
export function buildAccountV1Subject(accountId) {
  if (!checkUuid(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountV1SubjectPrefix}.${accountId}`;
}

/**
 * @param {Omit<AccountSnapshotV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountSnapshotV1Event}
 */
export function buildAccountSnapshotV1Event(data, version) {
  const event = {
    data: {
      ...data,
      version,
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

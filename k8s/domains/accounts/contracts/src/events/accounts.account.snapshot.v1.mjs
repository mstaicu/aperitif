import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/accounts";
const type = "accounts.account.snapshot.v1";
export const AccountV1SubjectPrefix = "accounts.account.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountMemberSchema = Type.Object(
  {
    roles: Type.Array(Type.Literal("owner"), { uniqueItems: true }),
    user_id: UuidSchema,
  },
  { additionalProperties: false },
);

const AccountSnapshotV1DataSchema = Type.Object(
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

export const AccountSnapshotV1Schema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountSnapshotV1DataSchema,
    dataschema: Type.Optional(Type.String({ format: "uri" })),
    id: UuidSchema,
    source: Type.Literal(source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ format: "date-time" }),
    traceparent: Type.Optional(Type.String({ minLength: 1 })),
    tracestate: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Literal(type),
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
 * @typedef {import("typebox").Static<
 *   typeof AccountSnapshotV1Schema
 * >} AccountSnapshotV1
 */

const uuidValidator = Compile(UuidSchema);
const accountSnapshotV1Validator = Compile(AccountSnapshotV1Schema);

/**
 * @param {unknown} event
 * @returns {event is AccountSnapshotV1}
 */
export function isAccountSnapshotV1(event) {
  return (
    accountSnapshotV1Validator.Check(event) &&
    event.subject === `account/${event.data.id}`
  );
}

/**
 * @param {AccountSnapshotV1["data"]} data
 * @returns {AccountSnapshotV1}
 */
export function buildAccountSnapshotV1(data) {
  const event = {
    data: {
      ...data,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source,
    specversion: "1.0",
    subject: `account/${data.id}`,
    time: new Date().toISOString(),
    type,
  };

  if (!isAccountSnapshotV1(event)) {
    throw new Error("INVALID_ACCOUNT_SNAPSHOT_EVENT");
  }

  return event;
}

/**
 * @param {string} accountId
 */
export function buildAccountV1Subject(accountId) {
  if (!uuidValidator.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountV1SubjectPrefix}.${accountId}`;
}

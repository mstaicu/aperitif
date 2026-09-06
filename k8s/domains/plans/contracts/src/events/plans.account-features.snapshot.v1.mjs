import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/plans";
const type = "plans.account-features.snapshot.v1";
export const AccountFeaturesV1SubjectPrefix = "plans.account-features.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountFeaturesSnapshotV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    features: Type.Record(
      // Preserve the feature-key pattern published in V1.
      Type.String({ pattern: "^(.*)$" }),
      Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
    ),
    version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export const AccountFeaturesSnapshotV1Schema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountFeaturesSnapshotV1DataSchema,
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
 *   typeof AccountFeaturesSnapshotV1Schema
 * >} AccountFeaturesSnapshotV1
 */

const uuidValidator = Compile(UuidSchema);
const accountFeaturesSnapshotV1Validator = Compile(
  AccountFeaturesSnapshotV1Schema,
);

/**
 * @param {unknown} event
 * @returns {event is AccountFeaturesSnapshotV1}
 */
export function isAccountFeaturesSnapshotV1(event) {
  return (
    accountFeaturesSnapshotV1Validator.Check(event) &&
    event.subject === `account/${event.data.account_id}`
  );
}

/**
 * @param {AccountFeaturesSnapshotV1["data"]} data
 * @returns {AccountFeaturesSnapshotV1}
 */
export function buildAccountFeaturesSnapshotV1(data) {
  const event = {
    data: {
      ...data,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source,
    specversion: "1.0",
    subject: `account/${data.account_id}`,
    time: new Date().toISOString(),
    type,
  };

  if (!isAccountFeaturesSnapshotV1(event)) {
    throw new Error("INVALID_ACCOUNT_FEATURES_SNAPSHOT_EVENT");
  }

  return event;
}

/**
 * @param {string} accountId
 */
export function buildAccountFeaturesV1Subject(accountId) {
  if (!uuidValidator.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountFeaturesV1SubjectPrefix}.${accountId}`;
}

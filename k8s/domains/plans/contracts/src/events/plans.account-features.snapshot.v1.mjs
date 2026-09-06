import { Type } from "@sinclair/typebox";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { randomUUID } from "node:crypto";

export const AccountFeaturesSnapshotV1Source = "/domains/plans";
export const AccountFeaturesSnapshotV1Type = "plans.account-features.snapshot.v1";
export const AccountFeaturesV1SubjectPrefix = "plans.account-features.v1";

const ajv = new Ajv();
addFormats(ajv);

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const checkUuid = ajv.compile(UuidSchema);

export const AccountFeaturesSnapshotV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    features: Type.Record(
      Type.String({ minLength: 1 }),
      Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
    ),
    version: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }),
  },
  { additionalProperties: false },
);

export const AccountFeaturesSnapshotV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountFeaturesSnapshotV1DataSchema,
    dataschema: Type.Optional(Type.String({ format: "uri" })),
    id: UuidSchema,
    source: Type.Literal(AccountFeaturesSnapshotV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ format: "date-time" }),
    traceparent: Type.Optional(Type.String({ minLength: 1 })),
    tracestate: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Literal(AccountFeaturesSnapshotV1Type),
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
 *   typeof AccountFeaturesSnapshotV1EventSchema
 * >} AccountFeaturesSnapshotV1Event
 */

const checkAccountFeaturesSnapshotV1Event = ajv.compile(
  AccountFeaturesSnapshotV1EventSchema,
);

export const AccountFeaturesSnapshotV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!checkAccountFeaturesSnapshotV1Event(event)) {
      return false;
    }

    return event.subject === `account/${event.data.account_id}`;
  },
};

/**
 * @param {string} accountId
 */
export function buildAccountFeaturesV1Subject(accountId) {
  if (!checkUuid(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountFeaturesV1SubjectPrefix}.${accountId}`;
}

/**
 * @param {Omit<AccountFeaturesSnapshotV1Event["data"], "version">} data
 * @param {number} version
 * @returns {AccountFeaturesSnapshotV1Event}
 */
export function buildAccountFeaturesSnapshotV1Event(data, version) {
  const event = {
    data: {
      ...data,
      version,
    },
    datacontenttype: "application/json",
    id: randomUUID(),
    source: AccountFeaturesSnapshotV1Source,
    specversion: "1.0",
    subject: `account/${data.account_id}`,
    time: new Date().toISOString(),
    type: AccountFeaturesSnapshotV1Type,
  };

  if (!AccountFeaturesSnapshotV1EventCheck.Check(event)) {
    throw new Error("INVALID_ACCOUNT_FEATURES_SNAPSHOT_EVENT");
  }

  return event;
}

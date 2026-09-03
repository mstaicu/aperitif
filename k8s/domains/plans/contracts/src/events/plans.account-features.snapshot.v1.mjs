import { Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { randomUUID } from "node:crypto";

export const AccountFeaturesSnapshotV1Source = "/domains/plans";
export const AccountFeaturesSnapshotV1Type = "plans.account-features.snapshot.v1";
export const AccountFeaturesV1SubjectPrefix = "plans.account-features.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const UuidCheck = TypeCompiler.Compile(UuidSchema);

export const AccountFeaturesSnapshotV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    features: Type.Record(
      Type.String({ minLength: 1 }),
      Type.Union([Type.Boolean(), Type.Number(), Type.String()]),
    ),
    revision: Type.Integer({ minimum: 1 }),
  },
  { additionalProperties: false },
);

export const AccountFeaturesSnapshotV1EventSchema = Type.Object(
  {
    datacontenttype: Type.Literal("application/json"),
    data: AccountFeaturesSnapshotV1DataSchema,
    id: UuidSchema,
    source: Type.Literal(AccountFeaturesSnapshotV1Source),
    specversion: Type.Literal("1.0"),
    subject: Type.String({
      pattern:
        "^account/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
    }),
    time: Type.String({ minLength: 1 }),
    type: Type.Literal(AccountFeaturesSnapshotV1Type),
  },
  { additionalProperties: false },
);

/**
 * @typedef {import("@sinclair/typebox").Static<
 *   typeof AccountFeaturesSnapshotV1EventSchema
 * >} AccountFeaturesSnapshotV1Event
 */

const AccountFeaturesSnapshotV1EventSchemaCheck = TypeCompiler.Compile(
  AccountFeaturesSnapshotV1EventSchema,
);

export const AccountFeaturesSnapshotV1EventCheck = {
  /**
   * @param {unknown} event
   */
  Check(event) {
    if (!AccountFeaturesSnapshotV1EventSchemaCheck.Check(event)) {
      return false;
    }

    return event.subject === `account/${event.data.account_id}`;
  },
};

/**
 * @param {string} accountId
 */
export function buildAccountFeaturesV1Subject(accountId) {
  if (!UuidCheck.Check(accountId)) {
    throw new Error("INVALID_ACCOUNT_ID");
  }

  return `${AccountFeaturesV1SubjectPrefix}.${accountId}`;
}

/**
 * @param {Omit<AccountFeaturesSnapshotV1Event["data"], "revision">} data
 * @param {number} revision
 * @returns {AccountFeaturesSnapshotV1Event}
 */
export function buildAccountFeaturesSnapshotV1Event(data, revision) {
  const event = {
    data: {
      ...data,
      revision,
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

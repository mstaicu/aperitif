import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.account.snapshot.v1";
export const AccountV1SubjectPrefix = "identity.state.account.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const AccountSnapshotV1DataSchema = Type.Object(
  {
    created_at: Type.String({
      description:
        "Source account creation timestamp; unchanged by updates. Not snapshot publication time or proof of a newly created account.",
      format: "date-time",
    }),
    id: {
      ...UuidSchema,
      description: "Account identity and cross-domain attribution key.",
    },
    name: Type.String({
      description:
        "Current display name; mutable and potentially identifying. Excluded from account-created events.",
      maxLength: 160,
      minLength: 1,
    }),
    version: Type.Integer({
      description:
        "Positive account revision; compare only revisions of the same account.",
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: 1,
    }),
  },
  { additionalProperties: false },
);

export const AccountSnapshotV1Schema = Type.Object(
  {
    data: AccountSnapshotV1DataSchema,
    id: {
      ...UuidSchema,
      description:
        "Snapshot message identity, separate from resource identity and revision.",
    },
    source: Type.Literal(source),
    specversion: Type.Literal("1.0"),
    type: Type.Literal(type),
  },
  {
    additionalProperties: false,
    description:
      "Complete exported current account state at a resource revision. Replaces earlier pending snapshots; it is not an account-created occurrence.",
    title: type,
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
 * @param {AccountSnapshotV1["data"]} data
 * @returns {AccountSnapshotV1}
 */
export function buildAccountSnapshotV1(data) {
  const event = {
    data: {
      ...data,
    },
    id: randomUUID(),
    source,
    specversion: "1.0",
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

/**
 * @param {unknown} event
 * @returns {event is AccountSnapshotV1}
 */
export function isAccountSnapshotV1(event) {
  return accountSnapshotV1Validator.Check(event);
}

import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.membership.snapshot.v1";
export const MembershipV1SubjectPrefix = "identity.state.membership.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const MembershipSnapshotV1DataSchema = Type.Object(
  {
    account_id: {
      ...UuidSchema,
      description:
        "Account referenced by this relationship; its snapshot can arrive independently.",
    },
    created_at: Type.String({
      description:
        "Source membership creation timestamp; unchanged by updates. Not message occurrence/publication time.",
      format: "date-time",
    }),
    id: {
      ...UuidSchema,
      description:
        "Membership resource identity, independent of account and principal IDs.",
    },
    principal_id: {
      ...UuidSchema,
      description:
        "Principal identity in this relationship, opaque to consumers.",
    },
    roles: Type.Array(Type.String({ minLength: 1 }), {
      description:
        "Unordered current Identity roles, not historical grants or Product-domain entitlements.",
      uniqueItems: true,
    }),
    version: Type.Integer({
      description:
        "Positive membership revision; compare only revisions of the same membership.",
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: 1,
    }),
  },
  { additionalProperties: false },
);

export const MembershipSnapshotV1Schema = Type.Object(
  {
    data: MembershipSnapshotV1DataSchema,
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
      "Complete exported current membership and roles at a resource revision. No active/deleted state is implemented.",
    title: type,
  },
);

/**
 * @typedef {import("typebox").Static<
 *   typeof MembershipSnapshotV1Schema
 * >} MembershipSnapshotV1
 */

const uuidValidator = Compile(UuidSchema);
const membershipSnapshotV1Validator = Compile(MembershipSnapshotV1Schema);

/**
 * @param {MembershipSnapshotV1["data"]} data
 * @returns {MembershipSnapshotV1}
 */
export function buildMembershipSnapshotV1(data) {
  const event = {
    data: {
      ...data,
    },
    id: randomUUID(),
    source,
    specversion: "1.0",
    type,
  };

  if (!isMembershipSnapshotV1(event)) {
    throw new Error("INVALID_MEMBERSHIP_SNAPSHOT_EVENT");
  }

  return event;
}

/**
 * @param {string} membershipId
 */
export function buildMembershipV1Subject(membershipId) {
  if (!uuidValidator.Check(membershipId)) {
    throw new Error("INVALID_MEMBERSHIP_ID");
  }

  return `${MembershipV1SubjectPrefix}.${membershipId}`;
}

/**
 * @param {unknown} event
 * @returns {event is MembershipSnapshotV1}
 */
export function isMembershipSnapshotV1(event) {
  return membershipSnapshotV1Validator.Check(event);
}

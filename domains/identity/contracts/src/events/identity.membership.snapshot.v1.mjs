import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { Compile } from "typebox/compile";

const source = "/domains/identity";
const type = "identity.membership.snapshot.v1";
export const MembershipV1SubjectPrefix = "identity.membership.v1";

const UuidSchema = Type.String({
  pattern:
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-7][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
});

const MembershipSnapshotV1DataSchema = Type.Object(
  {
    account_id: UuidSchema,
    id: UuidSchema,
    principal_id: Type.String({ minLength: 1 }),
    roles: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
    version: Type.Integer({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 }),
  },
  { additionalProperties: false },
);

export const MembershipSnapshotV1Schema = Type.Object(
  {
    data: MembershipSnapshotV1DataSchema,
    dataschema: Type.Optional(Type.String({ format: "uri" })),
    id: UuidSchema,
    source: Type.Literal(source),
    specversion: Type.Literal("1.0"),
    traceparent: Type.Optional(Type.String({ minLength: 1 })),
    tracestate: Type.Optional(Type.String({ minLength: 1 })),
    type: Type.Literal(type),
  },
  {
    additionalProperties: Type.Union([
      Type.String(),
      Type.Boolean(),
      Type.Integer({ maximum: 2147483647, minimum: -2147483648 }),
    ]),
    dependencies: { tracestate: ["traceparent"] },
    propertyNames: { pattern: "^[a-z0-9]+$" },
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

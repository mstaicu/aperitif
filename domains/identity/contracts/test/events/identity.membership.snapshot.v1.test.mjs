import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/identity.membership.snapshot.v1.json" with { type: "json" };
import {
  buildMembershipSnapshotV1,
  buildMembershipV1Subject,
  isMembershipSnapshotV1,
} from "../../src/index.mjs";

test("builds the documented membership snapshot with a fresh message ID", () => {
  // Arrange
  const data = example.data;

  // Act
  const event = buildMembershipSnapshotV1(data);
  const nextEvent = buildMembershipSnapshotV1(data);
  const exampleIsValid = isMembershipSnapshotV1(example);
  const eventIsValid = isMembershipSnapshotV1(event);

  // Assert
  assert.deepEqual(event, { ...example, id: event.id });
  assert.notEqual(event.id, nextEvent.id);
  assert.equal(exampleIsValid, true);
  assert.equal(eventIsValid, true);
});

test("rejects invalid membership snapshots at the consumer boundary", () => {
  // Arrange
  const missingCreatedAt = { ...example.data };
  delete missingCreatedAt.created_at;
  const invalidEvents = [
    ["not an event", null],
    ["wrong type", { ...example, type: "identity.membership.snapshot.v2" }],
    ["wrong source", { ...example, source: "/domains/product" }],
    ["missing creation time", { ...example, data: missingCreatedAt }],
    [
      "invalid creation time",
      { ...example, data: { ...example.data, created_at: "2026-10-30" } },
    ],
    [
      "non-positive version",
      { ...example, data: { ...example.data, version: 0 } },
    ],
    [
      "fractional version",
      { ...example, data: { ...example.data, version: 1.5 } },
    ],
    [
      "unsafe version",
      {
        ...example,
        data: { ...example.data, version: Number.MAX_SAFE_INTEGER + 1 },
      },
    ],
    [
      "missing principal",
      { ...example, data: { ...example.data, principal_id: "" } },
    ],
    [
      "duplicate roles",
      {
        ...example,
        data: { ...example.data, roles: ["account.owner", "account.owner"] },
      },
    ],
  ];

  // Act
  const results = invalidEvents.map(([reason, event]) => ({
    reason,
    valid: isMembershipSnapshotV1(event),
  }));

  // Assert
  for (const { reason, valid } of results) {
    assert.equal(valid, false, reason);
  }
});

test("accepts empty roles and distinct role assignments", () => {
  // Arrange
  const roleAssignments = [[], ["account.owner", "custom.reader"]];

  // Act
  const results = roleAssignments.map((roles) =>
    isMembershipSnapshotV1({ ...example, data: { ...example.data, roles } }),
  );

  // Assert
  assert.deepEqual(results, [true, true]);
});

test("refuses to construct a membership snapshot from invalid data", () => {
  // Arrange
  const data = { ...example.data, created_at: "not-a-timestamp" };

  // Act
  const build = () => buildMembershipSnapshotV1(data);

  // Assert
  assert.throws(build, { message: "INVALID_MEMBERSHIP_SNAPSHOT_EVENT" });
});

test("builds the membership subject from the resource ID", () => {
  // Arrange
  const membershipId = example.data.id;

  // Act
  const subject = buildMembershipV1Subject(membershipId);

  // Assert
  assert.equal(subject, `identity.membership.v1.${membershipId}`);
});

test("rejects an invalid membership ID instead of constructing a subject", () => {
  // Arrange
  const membershipId = "membership.*";

  // Act
  const build = () => buildMembershipV1Subject(membershipId);

  // Assert
  assert.throws(build, { message: "INVALID_MEMBERSHIP_ID" });
});

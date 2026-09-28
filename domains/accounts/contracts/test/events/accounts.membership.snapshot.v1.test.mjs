import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.membership.snapshot.v1.json" with { type: "json" };
import {
  buildMembershipSnapshotV1,
  buildMembershipV1Subject,
  isMembershipSnapshotV1,
} from "../../src/index.mjs";

test("builds and validates a Membership V1 snapshot", () => {
  // Arrange
  const data = {
    account_id: example.data.account_id,
    id: example.data.id,
    role: "owner",
    status: "active",
    subject_id: example.data.subject_id,
    version: 1,
  };

  // Act
  const event = buildMembershipSnapshotV1(data);
  const subject = buildMembershipV1Subject(data.id);

  // Assert
  assert.equal(isMembershipSnapshotV1(example), true);
  assert.equal(isMembershipSnapshotV1(event), true);
  assert.deepEqual(event.data, data);
  assert.equal(subject, `accounts.membership.v1.${data.id}`);
});

test("rejects malformed Membership V1 snapshots", () => {
  // Arrange
  const invalidEvents = [
    { ...example, type: "accounts.membership.snapshot.v2" },
    { ...example, subject: "membership/33333333-3333-4333-8333-333333333333" },
    { ...example, data: { ...example.data, role: "editor" } },
    { ...example, data: { ...example.data, status: "removed" } },
    { ...example, data: { ...example.data, version: 0 } },
  ];

  // Act and assert
  for (const event of invalidEvents) {
    assert.equal(isMembershipSnapshotV1(event), false);
  }
});

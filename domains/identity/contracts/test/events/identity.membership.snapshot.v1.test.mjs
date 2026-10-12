import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/identity.membership.snapshot.v1.json" with { type: "json" };
import {
  buildMembershipSnapshotV1,
  buildMembershipV1Subject,
  isMembershipSnapshotV1,
} from "../../src/index.mjs";

test("builds a membership snapshot and subject", () => {
  // Arrange
  const data = example.data;

  // Act
  const event = buildMembershipSnapshotV1(data);
  const subject = buildMembershipV1Subject(data.id);

  // Assert
  assert.equal(isMembershipSnapshotV1(example), true);
  assert.equal(isMembershipSnapshotV1(event), true);
  assert.deepEqual(event.data, data);
  assert.equal(subject, `identity.membership.v1.${data.id}`);
});

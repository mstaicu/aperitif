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
  const { principal_id, ...membership } = data;
  const legacyData = { ...membership, subject_id: principal_id };
  const invalidType = { ...example, type: "identity.membership.snapshot.v2" };

  // Act
  const event = buildMembershipSnapshotV1(data);
  const subject = buildMembershipV1Subject(data.id);

  // Assert
  assert.equal(isMembershipSnapshotV1(example), true);
  assert.equal(isMembershipSnapshotV1(event), true);
  assert.deepEqual(event, { ...example, id: event.id });
  assert.equal(isMembershipSnapshotV1({ ...example, data: legacyData }), false);
  assert.equal(subject, `identity.membership.v1.${data.id}`);
  assert.equal(isMembershipSnapshotV1(invalidType), false);
  assert.equal(
    isMembershipSnapshotV1({ ...example, data: { ...data, roles: [] } }),
    true,
  );
  assert.equal(
    isMembershipSnapshotV1({
      ...example,
      data: { ...data, roles: ["account.owner", "test.reader"] },
    }),
    true,
  );
  assert.equal(
    isMembershipSnapshotV1({
      ...example,
      data: { ...data, roles: ["account.owner", "account.owner"] },
    }),
    false,
  );
});

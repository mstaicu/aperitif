import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/identity.account.snapshot.v1.json" with { type: "json" };
import {
  buildAccountSnapshotV1,
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "../../src/index.mjs";

test("builds an account snapshot and subject", () => {
  // Arrange
  const data = example.data;
  const invalidType = { ...example, type: "identity.account.snapshot.v2" };

  // Act
  const event = buildAccountSnapshotV1(data);
  const subject = buildAccountV1Subject(data.id);

  // Assert
  assert.equal(isAccountSnapshotV1(example), true);
  assert.equal(isAccountSnapshotV1(event), true);
  assert.deepEqual(event, { ...example, id: event.id });
  assert.equal(subject, `identity.account.v1.${data.id}`);
  assert.equal(isAccountSnapshotV1(invalidType), false);
});

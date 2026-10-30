import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/identity.account.snapshot.v1.json" with { type: "json" };
import {
  buildAccountSnapshotV1,
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "../../src/index.mjs";

test("builds the documented account snapshot with a fresh message ID", () => {
  // Arrange
  const data = example.data;

  // Act
  const event = buildAccountSnapshotV1(data);
  const nextEvent = buildAccountSnapshotV1(data);
  const exampleIsValid = isAccountSnapshotV1(example);
  const eventIsValid = isAccountSnapshotV1(event);

  // Assert
  assert.deepEqual(event, { ...example, id: event.id });
  assert.notEqual(event.id, nextEvent.id);
  assert.equal(exampleIsValid, true);
  assert.equal(eventIsValid, true);
});

test("rejects invalid account snapshots at the consumer boundary", () => {
  // Arrange
  const missingCreatedAt = { ...example.data };
  delete missingCreatedAt.created_at;
  const invalidEvents = [
    ["not an event", null],
    ["wrong type", { ...example, type: "identity.account.snapshot.v2" }],
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
  ];

  // Act
  const results = invalidEvents.map(([reason, event]) => ({
    reason,
    valid: isAccountSnapshotV1(event),
  }));

  // Assert
  for (const { reason, valid } of results) {
    assert.equal(valid, false, reason);
  }
});

test("refuses to construct an account snapshot from invalid data", () => {
  // Arrange
  const data = { ...example.data, created_at: "not-a-timestamp" };

  // Act
  const build = () => buildAccountSnapshotV1(data);

  // Assert
  assert.throws(build, { message: "INVALID_ACCOUNT_SNAPSHOT_EVENT" });
});

test("builds the account subject from the resource ID", () => {
  // Arrange
  const accountId = example.data.id;

  // Act
  const subject = buildAccountV1Subject(accountId);

  // Assert
  assert.equal(subject, `identity.account.v1.${accountId}`);
});

test("rejects an invalid account ID instead of constructing a subject", () => {
  // Arrange
  const accountId = "account.*";

  // Act
  const build = () => buildAccountV1Subject(accountId);

  // Assert
  assert.throws(build, { message: "INVALID_ACCOUNT_ID" });
});

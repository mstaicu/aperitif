import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.account.snapshot.v1.json" with { type: "json" };
import {
  AccountSnapshotV1Schema,
  AccountV1SubjectPrefix,
  buildAccountSnapshotV1,
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "../../src/index.mjs";

test("accounts.account.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const version = Number.MAX_SAFE_INTEGER;
  const data = {
    id: example.data.id,
    members: [{ user_id: example.data.members[0].user_id, roles: [] }],
    name: "My account",
    type: "individual",
    version,
  };

  // Act
  const event = buildAccountSnapshotV1(data);
  const republished = buildAccountSnapshotV1(data);
  const subject = buildAccountV1Subject(data.id);
  const withMetadata = {
    ...event,
    dataschema: "https://example.com/accounts/account/v1",
    time: "2024-02-29T12:30:00+02:00",
    traceparent: "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01",
    tracestate: "vendor=value",
    attempt: 2,
    replay: true,
  };

  // Assert
  t.assert.snapshot(AccountSnapshotV1Schema);
  assert.equal(isAccountSnapshotV1(example), true);
  assert.equal(isAccountSnapshotV1(event), true);
  assert.equal(isAccountSnapshotV1(withMetadata), true);
  assert.deepEqual(event.data, data);
  assert.notEqual(event.id, republished.id);
  assert.deepEqual(republished.data, event.data);
  assert.equal(AccountV1SubjectPrefix, "accounts.account.v1");
  assert.equal(subject, `accounts.account.v1.${data.id}`);
});

test("rejects malformed V1 snapshots", () => {
  // Arrange
  const { data } = example;
  const invalidEvents = [
    null,
    { ...example, type: "accounts.account.snapshot.v2" },
    { ...example, subject: "account/44444444-4444-4444-8444-444444444444" },
    { ...example, time: "2026-02-30T00:00:00Z" },
    { ...example, time: "2026-09-06T12:00:00" },
    { ...example, dataschema: "/relative/schema" },
    { ...example, tracestate: "vendor=value" },
    { ...example, invalid_name: true },
    { ...example, metadata: { nested: true } },
    { ...example, attempt: 2147483648 },
    { ...example, data: { ...data, version: 0 } },
    { ...example, data: { ...data, version: 1.5 } },
    { ...example, data: { ...data, version: "1" } },
    { ...example, data: { ...data, version: Number.MAX_SAFE_INTEGER + 1 } },
    { ...example, data: {} },
    { ...example, data: { ...data, unexpected: true } },
    {
      ...example,
      data: {
        ...data,
        members: [{ user_id: data.members[0].user_id, roles: ["admin"] }],
      },
    },
  ];

  for (const event of invalidEvents) {
    // Act
    const valid = isAccountSnapshotV1(event);

    // Assert
    assert.equal(valid, false, JSON.stringify(event));
  }
});

test("builders reject invalid input", () => {
  // Arrange
  const { data } = example;

  // Act
  const buildSubject = () => buildAccountV1Subject("not-a-uuid");
  const buildEvent = () => buildAccountSnapshotV1({ ...data, version: 0 });

  // Assert
  assert.throws(buildSubject, /INVALID_ACCOUNT_ID/);
  assert.throws(buildEvent, /INVALID_ACCOUNT_SNAPSHOT_EVENT/);
});

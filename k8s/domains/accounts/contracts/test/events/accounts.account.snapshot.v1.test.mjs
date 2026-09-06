import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.account.snapshot.v1.json" with { type: "json" };
import {
  AccountSnapshotV1EventCheck,
  AccountSnapshotV1EventSchema,
  AccountV1SubjectPrefix,
  buildAccountSnapshotV1Event,
  buildAccountV1Subject,
} from "../../src/index.mjs";

test("accounts.account.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const data = {
    id: example.data.id,
    members: example.data.members,
    name: "My account",
    type: "individual",
  };

  // Act
  const event = buildAccountSnapshotV1Event(data, 7);
  const republished = buildAccountSnapshotV1Event(data, 7);
  const subject = buildAccountV1Subject(data.id);

  // Assert
  t.assert.snapshot(AccountSnapshotV1EventSchema);
  assert.equal(AccountSnapshotV1EventCheck.Check(example), true);
  assert.equal(AccountSnapshotV1EventCheck.Check(event), true);
  assert.deepEqual(event.data, { ...data, version: 7 });
  assert.notEqual(event.id, republished.id);
  assert.deepEqual(republished.data, event.data);
  assert.equal(AccountV1SubjectPrefix, "accounts.account.v1");
  assert.equal(subject, `accounts.account.v1.${data.id}`);
});

test("accepts members without roles, metadata, and the largest safe version", () => {
  // Arrange
  const event = {
    ...example,
    data: {
      ...example.data,
      members: [{ user_id: example.data.members[0].user_id, roles: [] }],
      version: Number.MAX_SAFE_INTEGER,
    },
    dataschema: "https://example.com/accounts/account/v1",
    time: "2024-02-29T12:30:00+02:00",
    traceparent: "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01",
    tracestate: "vendor=value",
    attempt: 2,
    replay: true,
  };

  // Act
  const valid = AccountSnapshotV1EventCheck.Check(event);

  // Assert
  assert.equal(valid, true);
});

test("rejects malformed V1 snapshots", () => {
  // Arrange
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
    { ...example, data: { ...example.data, version: 0 } },
    { ...example, data: { ...example.data, version: 1.5 } },
    { ...example, data: { ...example.data, version: "1" } },
    {
      ...example,
      data: { ...example.data, version: Number.MAX_SAFE_INTEGER + 1 },
    },
    { ...example, data: {} },
    { ...example, data: { ...example.data, unexpected: true } },
    {
      ...example,
      data: {
        ...example.data,
        members: [{ user_id: example.data.members[0].user_id, roles: ["admin"] }],
      },
    },
  ];

  for (const event of invalidEvents) {
    // Act
    const valid = AccountSnapshotV1EventCheck.Check(event);

    // Assert
    assert.equal(valid, false, `Accepted invalid event: ${JSON.stringify(event)}`);
  }
});

test("builders reject invalid input", () => {
  // Arrange
  const data = {
    id: example.data.id,
    members: example.data.members,
    name: example.data.name,
    type: example.data.type,
  };

  // Act & Assert
  assert.throws(() => buildAccountV1Subject("not-a-uuid"), /INVALID_ACCOUNT_ID/);
  assert.throws(
    () => buildAccountSnapshotV1Event(data, 0),
    /INVALID_ACCOUNT_SNAPSHOT_EVENT/,
  );
});

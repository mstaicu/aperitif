import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/plans.account-features.snapshot.v1.json" with { type: "json" };
import {
  AccountFeaturesSnapshotV1EventCheck,
  AccountFeaturesSnapshotV1EventSchema,
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesSnapshotV1Event,
  buildAccountFeaturesV1Subject,
} from "../../src/index.mjs";

test("plans.account-features.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const data = {
    account_id: example.data.account_id,
    features: { enabled: false, level: "basic", limit: 0 },
  };

  // Act
  const event = buildAccountFeaturesSnapshotV1Event(data, 7);
  const republished = buildAccountFeaturesSnapshotV1Event(data, 7);
  const subject = buildAccountFeaturesV1Subject(data.account_id);

  // Assert
  t.assert.snapshot(AccountFeaturesSnapshotV1EventSchema);
  assert.equal(AccountFeaturesSnapshotV1EventCheck.Check(example), true);
  assert.equal(AccountFeaturesSnapshotV1EventCheck.Check(event), true);
  assert.deepEqual(event.data, { ...data, version: 7 });
  assert.notEqual(event.id, republished.id);
  assert.deepEqual(republished.data, event.data);
  assert.equal(AccountFeaturesV1SubjectPrefix, "plans.account-features.v1");
  assert.equal(subject, `plans.account-features.v1.${data.account_id}`);
});

test("accepts optional CloudEvents metadata and safe resource versions", () => {
  // Arrange
  const event = {
    ...example,
    data: { ...example.data, version: Number.MAX_SAFE_INTEGER },
    dataschema: "https://example.com/plans/account-features/v1",
    time: "2024-02-29T12:30:00+02:00",
    traceparent: "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01",
    tracestate: "vendor=value",
    attempt: 2,
    replay: true,
  };

  // Act
  const valid = AccountFeaturesSnapshotV1EventCheck.Check(event);

  // Assert
  assert.equal(valid, true);
});

test("rejects malformed V1 snapshots", () => {
  // Arrange
  const invalidEvents = [
    null,
    { ...example, type: "plans.account-features.snapshot.v2" },
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
    { ...example, data: { ...example.data, features: { nested: {} } } },
  ];

  for (const event of invalidEvents) {
    // Act
    const valid = AccountFeaturesSnapshotV1EventCheck.Check(event);

    // Assert
    assert.equal(valid, false, `Accepted invalid event: ${JSON.stringify(event)}`);
  }
});

test("builders reject invalid input", () => {
  // Arrange
  const data = {
    account_id: example.data.account_id,
    features: example.data.features,
  };

  // Act & Assert
  assert.throws(
    () => buildAccountFeaturesV1Subject("not-a-uuid"),
    /INVALID_ACCOUNT_ID/,
  );
  assert.throws(
    () => buildAccountFeaturesSnapshotV1Event(data, 0),
    /INVALID_ACCOUNT_FEATURES_SNAPSHOT_EVENT/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/plans.account-features.snapshot.v1.json" with { type: "json" };
import {
  AccountFeaturesSnapshotV1Schema,
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesSnapshotV1,
  buildAccountFeaturesV1Subject,
  isAccountFeaturesSnapshotV1,
} from "../../src/index.mjs";

test("plans.account-features.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const version = Number.MAX_SAFE_INTEGER;
  const data = {
    account_id: example.data.account_id,
    features: { enabled: false, level: "basic", limit: 0 },
    version,
  };

  // Act
  const event = buildAccountFeaturesSnapshotV1(data);
  const republished = buildAccountFeaturesSnapshotV1(data);
  const subject = buildAccountFeaturesV1Subject(data.account_id);
  const withMetadata = {
    ...event,
    dataschema: "https://example.com/plans/account-features/v1",
    time: "2024-02-29T12:30:00+02:00",
    traceparent: "00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01",
    tracestate: "vendor=value",
    attempt: 2,
    replay: true,
  };

  // Assert
  t.assert.snapshot(AccountFeaturesSnapshotV1Schema);
  assert.equal(isAccountFeaturesSnapshotV1(example), true);
  assert.equal(isAccountFeaturesSnapshotV1(event), true);
  assert.equal(isAccountFeaturesSnapshotV1(withMetadata), true);
  assert.deepEqual(event.data, data);
  assert.notEqual(event.id, republished.id);
  assert.deepEqual(republished.data, event.data);
  assert.equal(AccountFeaturesV1SubjectPrefix, "plans.account-features.v1");
  assert.equal(subject, `plans.account-features.v1.${data.account_id}`);
});

test("rejects malformed V1 snapshots", () => {
  // Arrange
  const { data } = example;
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
    { ...example, data: { ...data, version: 0 } },
    { ...example, data: { ...data, version: 1.5 } },
    { ...example, data: { ...data, version: "1" } },
    { ...example, data: { ...data, version: Number.MAX_SAFE_INTEGER + 1 } },
    { ...example, data: {} },
    { ...example, data: { ...data, unexpected: true } },
    { ...example, data: { ...data, features: { nested: {} } } },
  ];

  for (const event of invalidEvents) {
    // Act
    const valid = isAccountFeaturesSnapshotV1(event);

    // Assert
    assert.equal(valid, false, JSON.stringify(event));
  }
});

test("builders reject invalid input", () => {
  // Arrange
  const { data } = example;

  // Act
  const buildSubject = () => buildAccountFeaturesV1Subject("not-a-uuid");
  const buildEvent = () => buildAccountFeaturesSnapshotV1({ ...data, version: 0 });

  // Assert
  assert.throws(buildSubject, /INVALID_ACCOUNT_ID/);
  assert.throws(buildEvent, /INVALID_ACCOUNT_FEATURES_SNAPSHOT_EVENT/);
});

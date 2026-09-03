import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/plans.account-features.snapshot.v1.json" with { type: "json" };
import {
  AccountFeaturesSnapshotV1EventCheck,
  AccountFeaturesSnapshotV1EventSchema,
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesSnapshotV1Event,
  buildAccountFeaturesV1Subject,
} from "../../src/events/plans.account-features.snapshot.v1.mjs";

const accountId = "22222222-2222-4222-8222-222222222222";

test("plans.account-features.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const mismatchedSubject = {
    ...example,
    subject: "account/44444444-4444-4444-8444-444444444444",
  };

  // Act
  const event = buildAccountFeaturesSnapshotV1Event(
    {
      account_id: accountId,
      features: {
        "example.enabled": true,
        "example.level": "expanded",
        "example.limit": 100,
      },
    },
    1,
  );
  const subject = buildAccountFeaturesV1Subject(accountId);

  // Assert
  t.assert.snapshot(AccountFeaturesSnapshotV1EventSchema);
  assert.equal(AccountFeaturesSnapshotV1EventCheck.Check(example), true);
  assert.equal(AccountFeaturesSnapshotV1EventCheck.Check(event), true);
  assert.equal(AccountFeaturesV1SubjectPrefix, "plans.account-features.v1");
  assert.equal(subject, `plans.account-features.v1.${accountId}`);
  assert.equal(AccountFeaturesSnapshotV1EventCheck.Check(mismatchedSubject), false);
});

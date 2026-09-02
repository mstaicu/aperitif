import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/plans.account-features.changed.v1.json" with { type: "json" };
import {
  AccountFeaturesChangedV1EventCheck,
  AccountFeaturesChangedV1EventSchema,
  AccountFeaturesV1SubjectPrefix,
  buildAccountFeaturesChangedV1Event,
  buildAccountFeaturesV1Subject,
} from "../../src/events/plans.account-features.changed.v1.mjs";

const accountId = "22222222-2222-4222-8222-222222222222";

test("plans.account-features.changed.v1 remains compatible", (t) => {
  // Arrange
  const mismatchedSubject = {
    ...example,
    subject: "account/44444444-4444-4444-8444-444444444444",
  };

  // Act
  const event = buildAccountFeaturesChangedV1Event(
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
  t.assert.snapshot(AccountFeaturesChangedV1EventSchema);
  assert.equal(AccountFeaturesChangedV1EventCheck.Check(example), true);
  assert.equal(AccountFeaturesChangedV1EventCheck.Check(event), true);
  assert.equal(AccountFeaturesV1SubjectPrefix, "plans.account-features.v1");
  assert.equal(subject, `plans.account-features.v1.${accountId}`);
  assert.equal(AccountFeaturesChangedV1EventCheck.Check(mismatchedSubject), false);
});

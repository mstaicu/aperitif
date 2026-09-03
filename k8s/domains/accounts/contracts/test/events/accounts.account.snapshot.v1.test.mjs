import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.account.snapshot.v1.json" with { type: "json" };
import {
  AccountSnapshotV1EventCheck,
  AccountSnapshotV1EventSchema,
  AccountV1SubjectPrefix,
  buildAccountSnapshotV1Event,
  buildAccountV1Subject,
} from "../../src/events/accounts.account.snapshot.v1.mjs";

const accountId = "22222222-2222-4222-8222-222222222222";

test("accounts.account.snapshot.v1 remains compatible", (t) => {
  // Arrange
  const mismatchedSubject = {
    ...example,
    subject: "account/44444444-4444-4444-8444-444444444444",
  };

  // Act
  const event = buildAccountSnapshotV1Event(
    {
      id: accountId,
      members: [
        {
          role: "owner",
          user_id: "33333333-3333-4333-8333-333333333333",
        },
      ],
      name: "Acme",
      type: "individual",
    },
    1,
  );
  const subject = buildAccountV1Subject(accountId);

  // Assert
  t.assert.snapshot(AccountSnapshotV1EventSchema);
  assert.equal(AccountSnapshotV1EventCheck.Check(example), true);
  assert.equal(AccountSnapshotV1EventCheck.Check(event), true);
  assert.equal(AccountV1SubjectPrefix, "accounts.account.v1");
  assert.equal(subject, `accounts.account.v1.${accountId}`);
  assert.equal(AccountSnapshotV1EventCheck.Check(mismatchedSubject), false);
});

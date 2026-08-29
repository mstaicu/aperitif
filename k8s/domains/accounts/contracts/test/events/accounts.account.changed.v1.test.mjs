import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.account.changed.v1.json" with { type: "json" };
import {
  AccountChangedV1EventCheck,
  AccountChangedV1EventSchema,
  AccountV1SubjectPrefix,
  buildAccountChangedV1Event,
  buildAccountV1Subject,
} from "../../src/events/accounts.account.changed.v1.mjs";

const accountId = "22222222-2222-4222-8222-222222222222";

test("accounts.account.changed.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountChangedV1EventSchema);

  assert.equal(AccountChangedV1EventCheck.Check(example), true);
  assert.equal(
    AccountChangedV1EventCheck.Check(
      buildAccountChangedV1Event({
        id: accountId,
        members: [
          {
            role: "owner",
            user_id: "33333333-3333-4333-8333-333333333333",
          },
        ],
        name: "Acme",
        type: "individual",
      }, 1),
    ),
    true,
  );
  assert.equal(AccountV1SubjectPrefix, "accounts.account.v1");
  assert.equal(
    buildAccountV1Subject(accountId),
    `accounts.account.v1.${accountId}`,
  );
  assert.equal(
    AccountChangedV1EventCheck.Check({
      ...example,
      subject: "account/44444444-4444-4444-8444-444444444444",
    }),
    false,
  );
});

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
      buildAccountChangedV1Event(
        {
          account: {
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
          accountId,
        },
        1,
      ),
    ),
    true,
  );
});

test("accounts.account.changed.v1 represents deletion with a tombstone", () => {
  const event = buildAccountChangedV1Event({ account: null, accountId }, 2);

  assert.equal(event.subject, `account/${accountId}`);
  assert.equal(event.data.account, null);
  assert.equal(event.data.version, 2);
  assert.equal(AccountChangedV1EventCheck.Check(event), true);
});

test("accounts.account.changed.v1 keeps its Account identity consistent", () => {
  assert.equal(
    AccountChangedV1EventCheck.Check({
      ...example,
      subject: "account/44444444-4444-4444-8444-444444444444",
    }),
    false,
  );
});

test("accounts.account.v1 identifies the retained Account representation", () => {
  assert.equal(AccountV1SubjectPrefix, "accounts.account.v1");
  assert.equal(
    buildAccountV1Subject(accountId),
    `accounts.account.v1.${accountId}`,
  );
  assert.throws(() => buildAccountV1Subject("not-a-uuid"), {
    message: "INVALID_ACCOUNT_ID",
  });
});

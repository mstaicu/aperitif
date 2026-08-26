import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.account.created.v1.json" with { type: "json" };
import {
  AccountCreatedV1EventCheck,
  AccountCreatedV1EventSchema,
  buildAccountCreatedV1Event,
} from "../../src/events/accounts.account.created.v1.mjs";

test("accounts.account.created.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountCreatedV1EventSchema);

  assert.equal(AccountCreatedV1EventCheck.Check(example), true);

  assert.equal(
    AccountCreatedV1EventCheck.Check(
      buildAccountCreatedV1Event(
        {
          account: {
            id: "22222222-2222-4222-8222-222222222222",
            members: [
              {
                role: "owner",
                user_id: "33333333-3333-4333-8333-333333333333",
              },
            ],
            name: "Acme",
            type: "individual",
          },
        },
        1,
      ),
    ),
    true,
  );
});

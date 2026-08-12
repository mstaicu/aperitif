import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.member.created.v1.json" with { type: "json" };
import {
  AccountMemberCreatedV1EventCheck,
  AccountMemberCreatedV1EventSchema,
  buildAccountMemberCreatedV1Event,
} from "../../src/events/accounts.member.created.v1.mjs";

test("accounts.member.created.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountMemberCreatedV1EventSchema);

  assert.equal(AccountMemberCreatedV1EventCheck.Check(example), true);

  assert.equal(
    AccountMemberCreatedV1EventCheck.Check(
      buildAccountMemberCreatedV1Event(
        {
          account_id: "22222222-2222-4222-8222-222222222222",
          member: {
            role: "owner",
            user_id: "33333333-3333-4333-8333-333333333333",
          },
        },
        2,
      ),
    ),
    true,
  );
});

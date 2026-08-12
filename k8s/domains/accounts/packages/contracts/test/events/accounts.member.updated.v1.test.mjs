import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.member.updated.v1.json" with { type: "json" };
import {
  AccountMemberUpdatedV1EventCheck,
  AccountMemberUpdatedV1EventSchema,
  buildAccountMemberUpdatedV1Event,
} from "../../src/events/accounts.member.updated.v1.mjs";

test("accounts.member.updated.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountMemberUpdatedV1EventSchema);

  assert.equal(AccountMemberUpdatedV1EventCheck.Check(example), true);

  assert.equal(
    AccountMemberUpdatedV1EventCheck.Check(
      buildAccountMemberUpdatedV1Event(
        {
          account_id: "22222222-2222-4222-8222-222222222222",
          member: {
            role: "owner",
            user_id: "33333333-3333-4333-8333-333333333333",
          },
        },
        3,
      ),
    ),
    true,
  );
});

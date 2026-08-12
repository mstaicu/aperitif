import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/accounts.member.deleted.v1.json" with { type: "json" };
import {
  AccountMemberDeletedV1EventCheck,
  AccountMemberDeletedV1EventSchema,
  buildAccountMemberDeletedV1Event,
} from "../../src/events/accounts.member.deleted.v1.mjs";

test("accounts.member.deleted.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountMemberDeletedV1EventSchema);

  assert.equal(AccountMemberDeletedV1EventCheck.Check(example), true);

  assert.equal(
    AccountMemberDeletedV1EventCheck.Check(
      buildAccountMemberDeletedV1Event(
        {
          account_id: "22222222-2222-4222-8222-222222222222",
          member: {
            role: "owner",
            user_id: "33333333-3333-4333-8333-333333333333",
          },
        },
        4,
      ),
    ),
    true,
  );
});

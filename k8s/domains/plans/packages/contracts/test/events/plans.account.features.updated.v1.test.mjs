import assert from "node:assert/strict";
import test from "node:test";

import example from "../../examples/events/plans.account.features.updated.v1.json" with { type: "json" };
import {
  AccountFeaturesUpdatedV1EventCheck,
  AccountFeaturesUpdatedV1EventSchema,
  buildAccountFeaturesUpdatedV1Event,
} from "../../src/events/plans.account.features.updated.v1.mjs";

test("plans.account.features.updated.v1 remains compatible", (t) => {
  t.assert.snapshot(AccountFeaturesUpdatedV1EventSchema);

  assert.equal(AccountFeaturesUpdatedV1EventCheck.Check(example), true);

  assert.equal(
    AccountFeaturesUpdatedV1EventCheck.Check(
      buildAccountFeaturesUpdatedV1Event(
        {
          account: {
            id: "22222222-2222-4222-8222-222222222222",
          },
          features: {
            "example.enabled": true,
            "example.level": "expanded",
            "example.limit": 100,
          },
        },
        1,
      ),
    ),
    true,
  );
});

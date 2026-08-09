import { AccountFeaturesUpdatedV1EventCheck } from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPlansService } from "./index.mjs";

test("sets a plan and publishes one versioned feature snapshot", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();
  const plans = createPlansService({ pool });

  await pool.query(
    `
      INSERT INTO plans (id, name)
      VALUES ('pro', 'Pro');

      INSERT INTO features (id, name)
      VALUES ('test.limit', 'Test limit');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES
        ('free', 'test.limit', '10'),
        ('pro', 'test.limit', '100')
    `,
  );

  await pool.query(
    `
      INSERT INTO account_plans (account_id, plan_id)
      VALUES ($1, 'free')
    `,
    [accountId],
  );

  assert.deepEqual(await plans.setPlan({ accountId, planId: "pro" }), {
    plan: {
      features: { "test.limit": 100 },
      id: "pro",
    },
  });
  await plans.setPlan({ accountId, planId: "pro" });

  const {
    rows: [state],
  } = await pool.query(
    `
      SELECT plan_id,
        version::integer,
        (SELECT count(*)::integer FROM outbox_events) AS event_count,
        (SELECT event FROM outbox_events LIMIT 1) AS snapshot
      FROM account_plans
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.equal(AccountFeaturesUpdatedV1EventCheck.Check(state.snapshot), true);
  assert.deepEqual(
    { ...state, snapshot: state.snapshot.data },
    {
      event_count: 1,
      plan_id: "pro",
      snapshot: {
        account: { id: accountId },
        features: { "test.limit": 100 },
        version: 2,
      },
      version: 2,
    },
  );
});

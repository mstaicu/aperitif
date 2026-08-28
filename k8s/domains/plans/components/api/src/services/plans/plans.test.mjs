import {
  AccountFeaturesChangedV1EventCheck,
  buildAccountFeaturesChangedV1Event,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
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

  const subject = buildAccountFeaturesV1Subject(accountId);
  const freeSnapshot = buildAccountFeaturesChangedV1Event(
    {
      account: { id: accountId },
      features: { "test.limit": 10 },
    },
    1,
  );

  await pool.query(
    `
      INSERT INTO outbox_events (id, subject, event)
      VALUES ($1, $2, $3::jsonb)
    `,
    [freeSnapshot.id, subject, JSON.stringify(freeSnapshot)],
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
        (SELECT subject FROM outbox_events LIMIT 1) AS subject,
        (SELECT event FROM outbox_events LIMIT 1) AS snapshot
      FROM account_plans
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.equal(AccountFeaturesChangedV1EventCheck.Check(state.snapshot), true);
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
      subject,
      version: 2,
    },
  );
});

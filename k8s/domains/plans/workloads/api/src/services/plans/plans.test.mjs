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

test("replaces a pending feature snapshot when a plan changes", async () => {
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
      account_id: accountId,
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
    rows: [accountPlan],
  } = await pool.query(
    `
      SELECT plan_id,
        version::integer
      FROM account_plans
      WHERE account_id = $1
    `,
    [accountId],
  );
  const { rows: outbox } = await pool.query(
    `
      SELECT event,
        subject
      FROM outbox_events
    `,
  );

  assert.deepEqual(accountPlan, { plan_id: "pro", version: 2 });
  assert.equal(outbox.length, 1);
  const [snapshot] = outbox;
  assert.equal(AccountFeaturesChangedV1EventCheck.Check(snapshot.event), true);
  assert.equal(snapshot.subject, subject);
  assert.deepEqual(snapshot.event.data, {
    account_id: accountId,
    features: { "test.limit": 100 },
    revision: 2,
  });
});

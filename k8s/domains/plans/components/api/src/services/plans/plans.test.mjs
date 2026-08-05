import {
  AccountFeaturesUpdatedV1EventCheck,
  AccountFeaturesUpdatedV1Type,
} from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { getPlansService } from "./index.mjs";

test("sets an account plan and publishes its feature values", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;

  const accountId = randomUUID();
  const plans = getPlansService({ pool });

  await pool.query(
    `
      INSERT INTO plans (id, name)
      VALUES
        ('starter', 'Starter'),
        ('pro', 'Pro');

      INSERT INTO features (id, name)
      VALUES
        ('test.enabled', 'Enabled'),
        ('test.limit', 'Limit'),
        ('test.level', 'Level');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES
        ('starter', 'test.enabled', 'false'),
        ('starter', 'test.limit', '10'),
        ('starter', 'test.level', '"limited"'),
        ('pro', 'test.enabled', 'true'),
        ('pro', 'test.limit', '100'),
        ('pro', 'test.level', '"expanded"')
    `,
  );

  await pool.query(
    `
      INSERT INTO projected_accounts (account_id, version)
      VALUES ($1, 1)
    `,
    [accountId],
  );

  await plans.set({
    accountId,
    planId: "starter",
  });

  const result = await plans.set({
    accountId,
    planId: "pro",
  });

  assert.deepEqual(result, {
    plan: {
      features: {
        "test.enabled": true,
        "test.level": "expanded",
        "test.limit": 100,
      },
      id: "pro",
    },
  });

  const {
    rows: [{ event }],
  } = await pool.query(
    `
      SELECT event
      FROM outbox_events
      WHERE event->>'type' = $1
        AND event #>> '{data,account,id}' = $2
      ORDER BY (event #>> '{data,version}')::bigint DESC
      LIMIT 1
    `,
    [AccountFeaturesUpdatedV1Type, accountId],
  );

  assert.equal(AccountFeaturesUpdatedV1EventCheck.Check(event), true);
  assert.deepEqual(event.data, {
    account: { id: accountId },
    features: {
      "test.enabled": true,
      "test.level": "expanded",
      "test.limit": 100,
    },
    version: 2,
  });

  assert.deepEqual(
    await plans.set({
      accountId,
      planId: "pro",
    }),
    result,
  );

  const {
    rows: [state],
  } = await pool.query(
    `
      SELECT version::integer,
        (SELECT count(*)::integer FROM outbox_events) AS event_count
      FROM account_plans
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.deepEqual(state, {
    event_count: 2,
    version: 2,
  });
});

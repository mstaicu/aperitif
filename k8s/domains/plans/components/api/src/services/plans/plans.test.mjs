import { AccountFeaturesUpdatedV1EventCheck } from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { getPlansService } from "./index.mjs";

test("resolves plans and overrides into versioned feature snapshots", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();
  const plans = getPlansService({ pool });

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
      INSERT INTO projected_accounts (account_id, version)
      VALUES ($1, 1)
    `,
    [accountId],
  );

  await pool.query(
    `
      INSERT INTO account_plans (account_id, plan_id)
      VALUES ($1, 'free')
    `,
    [accountId],
  );

  assert.deepEqual(await plans.set({ accountId, planId: "pro" }), {
    plan: {
      features: { "test.limit": 100 },
      id: "pro",
    },
  });
  await plans.set({ accountId, planId: "pro" });

  assert.deepEqual(
    await plans.setOverride({
      accountId,
      featureId: "test.limit",
      value: 250,
    }),
    { features: { "test.limit": 250 } },
  );
  await plans.setOverride({
    accountId,
    featureId: "test.limit",
    value: 250,
  });

  assert.deepEqual(
    await plans.deleteOverride({
      accountId,
      featureId: "test.limit",
    }),
    { features: { "test.limit": 100 } },
  );
  await plans.deleteOverride({
    accountId,
    featureId: "test.limit",
  });

  const { rows } = await pool.query(
    `
      SELECT event
      FROM outbox_events
      ORDER BY (event #>> '{data,version}')::bigint
    `,
  );

  assert.equal(
    rows.every(({ event }) => AccountFeaturesUpdatedV1EventCheck.Check(event)),
    true,
  );
  assert.deepEqual(
    rows.map(({ event }) => event.data),
    [
      {
        account: { id: accountId },
        features: { "test.limit": 100 },
        version: 2,
      },
      {
        account: { id: accountId },
        features: { "test.limit": 250 },
        version: 3,
      },
      {
        account: { id: accountId },
        features: { "test.limit": 100 },
        version: 4,
      },
    ],
  );
});

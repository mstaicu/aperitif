import { buildAccountCreatedV1Event } from "@mstaicu/accounts-contracts";
import { AccountFeaturesUpdatedV1EventCheck } from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountCreatedV1 } from "./account-created-v1.mjs";

test("assigns the free plan and publishes its features once", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();

  await pool.query(
    `
      INSERT INTO features (id, name)
      VALUES ('test.limit', 'Test limit');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES ('free', 'test.limit', '10')
    `,
  );

  const accountCreated = buildAccountCreatedV1Event(
    {
      account: {
        id: accountId,
        name: "Acme",
        type: "organization",
      },
    },
    1,
  );

  await projectAccountCreatedV1({ event: accountCreated, pool });
  await projectAccountCreatedV1({ event: accountCreated, pool });

  const {
    rows: [state],
  } = await pool.query(
    `
      SELECT pa.version::integer AS account_version,
        ap.plan_id,
        ap.version::integer AS plan_version,
        (SELECT count(*)::integer FROM outbox_events) AS event_count,
        (SELECT event FROM outbox_events LIMIT 1) AS snapshot
      FROM projected_accounts pa
      JOIN account_plans ap USING (account_id)
      WHERE pa.account_id = $1
    `,
    [accountId],
  );

  assert.equal(AccountFeaturesUpdatedV1EventCheck.Check(state.snapshot), true);
  assert.deepEqual(
    {
      ...state,
      snapshot: state.snapshot.data,
    },
    {
      account_version: 1,
      event_count: 1,
      plan_id: "free",
      plan_version: 1,
      snapshot: {
        account: { id: accountId },
        features: { "test.limit": 10 },
        version: 1,
      },
    },
  );
});

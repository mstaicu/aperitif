import { buildAccountChangedV1Event } from "@mstaicu/accounts-contracts";
import {
  AccountFeaturesChangedV1EventCheck,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountChangedV1 } from "./account-changed-v1.mjs";

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

  const accountChanged = buildAccountChangedV1Event(
    {
      id: accountId,
      members: [
        {
          role: "owner",
          user_id: randomUUID(),
        },
      ],
      name: "Acme",
      type: "organization",
    },
    1,
  );

  await projectAccountChangedV1({ event: accountChanged, pool });
  await projectAccountChangedV1({ event: accountChanged, pool });

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
    {
      ...state,
      snapshot: state.snapshot.data,
    },
    {
      event_count: 1,
      plan_id: "free",
      snapshot: {
        account_id: accountId,
        features: { "test.limit": 10 },
        revision: 1,
      },
      subject: buildAccountFeaturesV1Subject(accountId),
      version: 1,
    },
  );
});

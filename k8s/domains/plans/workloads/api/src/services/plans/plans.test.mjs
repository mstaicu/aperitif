import {
  AccountFeaturesSnapshotV1EventCheck,
  buildAccountFeaturesSnapshotV1Event,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPlansService } from "./index.mjs";

test("changes a plan once and replaces its pending feature snapshot", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();
  const plans = createPlansService({ pool });

  await pool.query(
    `INSERT INTO plans (id, name) VALUES ('pro', 'Pro');

      INSERT INTO features (id, name)
      VALUES ('test.limit', 'Test limit');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES ('free', 'test.limit', '10'), ('pro', 'test.limit', '100')`,
  );

  await pool.query(
    "INSERT INTO account_plans (account_id, plan_id) VALUES ($1, 'free')",
    [accountId],
  );

  const subject = buildAccountFeaturesV1Subject(accountId);
  const freeSnapshot = buildAccountFeaturesSnapshotV1Event(
    { account_id: accountId, features: { "test.limit": 10 } },
    1,
  );

  await pool.query(
    "INSERT INTO outbox_messages (id, subject, payload) VALUES ($1, $2, $3)",
    [freeSnapshot.id, subject, freeSnapshot],
  );

  // Act
  const result = await plans.setPlan({ accountId, planId: "pro" });
  const repeated = await plans.setPlan({ accountId, planId: "pro" });

  // Assert
  const { rows: accountPlans } = await pool.query(
    "SELECT account_id, plan_id, version::integer FROM account_plans",
  );
  const { rows: outbox } = await pool.query(
    "SELECT id, payload, headers, subject FROM outbox_messages",
  );

  assert.deepEqual(result, {
    plan: { features: { "test.limit": 100 }, id: "pro" },
  });
  assert.deepEqual(repeated, result);
  assert.deepEqual(accountPlans, [
    { account_id: accountId, plan_id: "pro", version: 2 },
  ]);
  assert.equal(outbox.length, 1);
  const [snapshot] = outbox;
  assert.equal(
    AccountFeaturesSnapshotV1EventCheck.Check(snapshot.payload),
    true,
  );
  assert.equal(snapshot.id, snapshot.payload.id);
  assert.notEqual(snapshot.id, freeSnapshot.id);
  assert.equal(
    snapshot.headers["Content-Type"],
    "application/cloudevents+json",
  );
  assert.equal(snapshot.subject, subject);
  assert.deepEqual(snapshot.payload.data, {
    account_id: accountId,
    features: { "test.limit": 100 },
    version: 2,
  });
});

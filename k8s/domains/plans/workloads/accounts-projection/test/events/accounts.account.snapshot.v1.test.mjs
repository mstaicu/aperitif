import {
  buildAccountSnapshotV1Event,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import {
  AccountFeaturesSnapshotV1EventCheck,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { projectAccountSnapshotV1 } from "../../src/events/accounts.account.snapshot.v1.mjs";
import { startPostgres } from "../fixtures/postgres.mjs";

test("initializes a free plan once; replay does not reset a paid plan", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();

  await pool.query(
    `INSERT INTO plans (id, name) VALUES ('pro', 'Pro');

      INSERT INTO features (id, name)
      VALUES ('test.limit', 'Test limit');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES ('free', 'test.limit', '10')`,
  );

  const event = buildAccountSnapshotV1Event(
    {
      id: accountId,
      members: [
        { roles: ["owner"], user_id: randomUUID() },
        { roles: [], user_id: randomUUID() },
      ],
      name: "Acme",
      type: "organization",
    },
    7,
  );
  const message = {
    json: () => event,
    subject: buildAccountV1Subject(accountId),
  };

  // Act
  await projectAccountSnapshotV1({ message, pool });
  await projectAccountSnapshotV1({ message, pool });

  // Assert
  const { rows: accountPlans } = await pool.query(
    "SELECT account_id, plan_id, version::integer FROM account_plans",
  );
  const { rows: outbox } = await pool.query(
    "SELECT id, payload, headers, subject FROM outbox_messages",
  );

  assert.deepEqual(accountPlans, [
    { account_id: accountId, plan_id: "free", version: 1 },
  ]);
  assert.equal(outbox.length, 1);
  const [snapshot] = outbox;
  assert.equal(
    AccountFeaturesSnapshotV1EventCheck.Check(snapshot.payload),
    true,
  );
  assert.equal(snapshot.id, snapshot.payload.id);
  assert.equal(
    snapshot.headers["Content-Type"],
    "application/cloudevents+json",
  );
  assert.equal(snapshot.subject, buildAccountFeaturesV1Subject(accountId));
  assert.deepEqual(snapshot.payload.data, {
    account_id: accountId,
    features: { "test.limit": 10 },
    version: 1,
  });

  // Arrange: Plans has since upgraded this Account.
  await pool.query(
    "UPDATE account_plans SET plan_id = 'pro', version = 2 WHERE account_id = $1",
    [accountId],
  );

  // Act
  await projectAccountSnapshotV1({ message, pool });

  // Assert
  const { rows: afterReplay } = await pool.query(
    "SELECT account_id, plan_id, version::integer FROM account_plans",
  );
  const { rows: pending } = await pool.query(
    "SELECT id, payload, headers, subject FROM outbox_messages",
  );
  assert.deepEqual(afterReplay, [
    { account_id: accountId, plan_id: "pro", version: 2 },
  ]);
  assert.deepEqual(pending, outbox);
});

test("rejects an unsupported event or a mismatched NATS subject before writing", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const event = buildAccountSnapshotV1Event(
    {
      id: randomUUID(),
      members: [{ roles: ["owner"], user_id: randomUUID() }],
      name: "Acme",
      type: "organization",
    },
    1,
  );

  // Act
  const unsupported = projectAccountSnapshotV1({
    message: {
      json: () => ({ ...event, type: "accounts.account.snapshot.v2" }),
      subject: buildAccountV1Subject(event.data.id),
    },
    pool,
  });

  // Assert
  await assert.rejects(unsupported, /INVALID_ACCOUNT_SNAPSHOT_EVENT/);

  // Act
  const mismatched = projectAccountSnapshotV1({
    message: {
      json: () => event,
      subject: buildAccountV1Subject(randomUUID()),
    },
    pool,
  });

  // Assert
  await assert.rejects(mismatched, /ACCOUNT_V1_SUBJECT_MISMATCH/);
  assert.deepEqual((await pool.query("SELECT * FROM account_plans")).rows, []);
  assert.deepEqual(
    (await pool.query("SELECT * FROM outbox_messages")).rows,
    [],
  );
});

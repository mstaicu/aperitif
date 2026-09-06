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

test("initializes an Account's free plan once from its current state", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();
  const ownerId = randomUUID();

  await pool.query(
    `
      INSERT INTO features (id, name)
      VALUES ('test.limit', 'Test limit');

      INSERT INTO plan_features (plan_id, feature_id, value)
      VALUES ('free', 'test.limit', '10')
    `,
  );

  const event = buildAccountSnapshotV1Event(
    {
      id: accountId,
      members: [
        {
          roles: ["owner"],
          user_id: ownerId,
        },
        {
          roles: [],
          user_id: randomUUID(),
        },
      ],
      name: "Acme",
      type: "organization",
    },
    7,
  );
  const subject = buildAccountV1Subject(accountId);
  const message = {
    json: () => event,
    subject,
  };

  // Act
  await projectAccountSnapshotV1({ message, pool });
  await projectAccountSnapshotV1({ message, pool });
  const invalidProjection = projectAccountSnapshotV1({
    message: {
      ...message,
      subject: buildAccountV1Subject(randomUUID()),
    },
    pool,
  });

  // Assert
  await assert.rejects(invalidProjection, {
    message: "ACCOUNT_V1_SUBJECT_MISMATCH",
  });
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
      SELECT id,
        payload,
        headers,
        subject
      FROM outbox_messages
    `,
  );

  assert.deepEqual(accountPlan, { plan_id: "free", version: 1 });
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
});

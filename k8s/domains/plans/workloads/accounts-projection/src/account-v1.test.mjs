import {
  buildAccountChangedV1Event,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import {
  AccountFeaturesChangedV1EventCheck,
  buildAccountFeaturesV1Subject,
} from "@mstaicu/plans-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../test/fixtures/postgres.mjs";
import { projectAccountV1 } from "./account-v1.mjs";

test("initializes an Account's free plan once from its current state", async () => {
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

  const event = buildAccountChangedV1Event(
    {
      id: accountId,
      members: [
        {
          role: "owner",
          user_id: ownerId,
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

  await projectAccountV1({ message, pool });
  await projectAccountV1({ message, pool });

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

  assert.deepEqual(accountPlan, { plan_id: "free", version: 1 });
  assert.equal(outbox.length, 1);
  const [snapshot] = outbox;
  assert.equal(AccountFeaturesChangedV1EventCheck.Check(snapshot.event), true);
  assert.equal(snapshot.subject, buildAccountFeaturesV1Subject(accountId));
  assert.deepEqual(snapshot.event.data, {
    account_id: accountId,
    features: { "test.limit": 10 },
    revision: 1,
  });

  await assert.rejects(
    projectAccountV1({
      message: {
        ...message,
        subject: buildAccountV1Subject(randomUUID()),
      },
      pool,
    }),
    { message: "ACCOUNT_V1_SUBJECT_MISMATCH" },
  );
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { AccountCapabilitiesUpdatedSubject } from "../../events/index.mjs";
import { createAccountCapabilitiesService } from "./index.mjs";

/** @param {import("pg").Pool} db */
const seedTestCapabilities = async (db) => {
  await db.query(
    `
      INSERT INTO capabilities (
        id,
        name,
        value_type,
        merge_strategy
      )
      VALUES
        ('test.enabled', 'Test Enabled', 'boolean', 'boolean_or'),
        ('test.max', 'Test Max', 'number', 'number_max'),
        ('test.sum', 'Test Sum', 'number', 'number_sum')
    `,
  );
};

/** @param {import("pg").Pool} db */
const createProjectedAccount = async (db) => {
  const accountId = randomUUID();

  await db.query(
    `
      INSERT INTO projected_accounts (account_id, version)
      VALUES ($1, 1)
    `,
    [accountId],
  );

  return accountId;
};

/**
 * @param {{
 *   accountId: string,
 *   db: import("pg").Pool,
 * }} args
 */
const latestOutboxEvent = async ({ accountId, db }) => {
  const {
    rows: [outbox],
  } = await db.query(
    `
      SELECT event
      FROM outbox_events
      WHERE event->>'subject' = $1
        AND event #>> '{payload,account,id}' = $2
      ORDER BY (event->>'version')::bigint DESC
      LIMIT 1
    `,
    [AccountCapabilitiesUpdatedSubject, accountId],
  );

  return outbox.event;
};

test("account capabilities add grants and publish a reduced snapshot", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountCapabilities = createAccountCapabilitiesService({ db });
  const accountId = await createProjectedAccount(db);

  await seedTestCapabilities(db);

  // Act
  const added = await accountCapabilities.addAccountCapabilities({
    accountId,
    capabilities: [
      {
        capability_id: "test.enabled",
        grant_id: randomUUID(),
        value: false,
      },
      {
        capability_id: "test.enabled",
        grant_id: randomUUID(),
        value: true,
      },
      {
        capability_id: "test.max",
        grant_id: randomUUID(),
        value: 10,
      },
      {
        capability_id: "test.max",
        grant_id: randomUUID(),
        value: 20,
      },
      {
        capability_id: "test.sum",
        grant_id: randomUUID(),
        value: 2,
      },
      {
        capability_id: "test.sum",
        grant_id: randomUUID(),
        value: 3,
      },
    ],
  });

  // Assert
  assert.deepEqual(added, { account_id: accountId });

  const event = await latestOutboxEvent({ accountId, db });

  assert.equal(event.subject, AccountCapabilitiesUpdatedSubject);
  assert.equal(event.schema_version, 1);
  assert.equal(event.version, 1);
  assert.deepEqual(event.payload.account, {
    id: accountId,
  });
  assert.deepEqual(event.payload.capabilities, [
    {
      id: "test.enabled",
      value: true,
    },
    {
      id: "test.max",
      value: 20,
    },
    {
      id: "test.sum",
      value: 5,
    },
  ]);
});

test("account capabilities revoke grants and publish a reduced snapshot", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountCapabilities = createAccountCapabilitiesService({ db });
  const accountId = await createProjectedAccount(db);
  const lowerGrantId = randomUUID();
  const higherGrantId = randomUUID();

  await seedTestCapabilities(db);
  await accountCapabilities.addAccountCapabilities({
    accountId,
    capabilities: [
      {
        capability_id: "test.max",
        grant_id: lowerGrantId,
        value: 10,
      },
      {
        capability_id: "test.max",
        grant_id: higherGrantId,
        value: 20,
      },
    ],
  });

  // Act
  const revoked = await accountCapabilities.revokeAccountCapabilities({
    accountId,
    capabilities: [
      {
        capability_id: "test.max",
        grant_id: higherGrantId,
      },
    ],
  });

  // Assert
  assert.deepEqual(revoked, { account_id: accountId });

  const event = await latestOutboxEvent({ accountId, db });

  assert.equal(event.subject, AccountCapabilitiesUpdatedSubject);
  assert.equal(event.schema_version, 1);
  assert.equal(event.version, 2);
  assert.deepEqual(event.payload.capabilities, [
    {
      id: "test.max",
      value: 10,
    },
  ]);
});

test("account capabilities reject grants for missing accounts", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountCapabilities = createAccountCapabilitiesService({ db });

  await seedTestCapabilities(db);

  // Act
  const addGrant = accountCapabilities.addAccountCapabilities({
    accountId: randomUUID(),
    capabilities: [
      {
        capability_id: "test.enabled",
        grant_id: randomUUID(),
        value: true,
      },
    ],
  });

  // Assert
  await assert.rejects(addGrant, /ACCOUNT_NOT_FOUND/);
});

test("account capabilities reject invalid grant values", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountCapabilities = createAccountCapabilitiesService({ db });
  const accountId = await createProjectedAccount(db);

  await seedTestCapabilities(db);

  // Act
  const addGrant = accountCapabilities.addAccountCapabilities({
    accountId,
    capabilities: [
      {
        capability_id: "test.enabled",
        grant_id: randomUUID(),
        value: 1,
      },
    ],
  });

  // Assert
  await assert.rejects(addGrant, /INVALID_CAPABILITY_VALUE/);
});

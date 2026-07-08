import {
  AccountEntitlementsUpdatedV1EventCheck,
  AccountEntitlementsUpdatedV1Type,
} from "@mstaicu/entitlements-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccountEntitlementsService } from "./index.mjs";

/** @param {import("pg").Pool} db */
const seedTestEntitlements = async (db) => {
  await db.query(
    `
      INSERT INTO entitlements (
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
      INSERT INTO projected_accounts (account_id, type, version)
      VALUES ($1, 'business', 1)
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
      WHERE event->>'type' = $1
        AND event #>> '{data,account,id}' = $2
      ORDER BY (event #>> '{data,version}')::bigint DESC
      LIMIT 1
    `,
    [AccountEntitlementsUpdatedV1Type, accountId],
  );

  return outbox.event;
};

test("account entitlements add grants and publish a reduced snapshot", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountEntitlements = createAccountEntitlementsService({ db });
  const accountId = await createProjectedAccount(db);

  await seedTestEntitlements(db);

  // Act
  const added = await accountEntitlements.addAccountEntitlements({
    accountId,
    entitlements: [
      {
        entitlement_id: "test.enabled",
        grant_id: randomUUID(),
        value: false,
      },
      {
        entitlement_id: "test.enabled",
        grant_id: randomUUID(),
        value: true,
      },
      {
        entitlement_id: "test.max",
        grant_id: randomUUID(),
        value: 10,
      },
      {
        entitlement_id: "test.max",
        grant_id: randomUUID(),
        value: 20,
      },
      {
        entitlement_id: "test.sum",
        grant_id: randomUUID(),
        value: 2,
      },
      {
        entitlement_id: "test.sum",
        grant_id: randomUUID(),
        value: 3,
      },
    ],
  });

  // Assert
  assert.deepEqual(added, { account_id: accountId });

  const event = await latestOutboxEvent({ accountId, db });

  assert.equal(AccountEntitlementsUpdatedV1EventCheck.Check(event), true);
  assert.equal(event.type, AccountEntitlementsUpdatedV1Type);
  assert.equal(event.data.version, 1);
  assert.deepEqual(event.data.account, {
    id: accountId,
  });
  assert.deepEqual(event.data.entitlements, [
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

test("account entitlements revoke grants and publish a reduced snapshot", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountEntitlements = createAccountEntitlementsService({ db });
  const accountId = await createProjectedAccount(db);
  const lowerGrantId = randomUUID();
  const higherGrantId = randomUUID();

  await seedTestEntitlements(db);
  await accountEntitlements.addAccountEntitlements({
    accountId,
    entitlements: [
      {
        entitlement_id: "test.max",
        grant_id: lowerGrantId,
        value: 10,
      },
      {
        entitlement_id: "test.max",
        grant_id: higherGrantId,
        value: 20,
      },
    ],
  });

  // Act
  const revoked = await accountEntitlements.revokeAccountEntitlements({
    accountId,
    entitlements: [
      {
        entitlement_id: "test.max",
        grant_id: higherGrantId,
      },
    ],
  });

  // Assert
  assert.deepEqual(revoked, { account_id: accountId });

  const event = await latestOutboxEvent({ accountId, db });

  assert.equal(AccountEntitlementsUpdatedV1EventCheck.Check(event), true);
  assert.equal(event.type, AccountEntitlementsUpdatedV1Type);
  assert.equal(event.data.version, 2);
  assert.deepEqual(event.data.entitlements, [
    {
      id: "test.max",
      value: 10,
    },
  ]);
});

test("account entitlements reject grants for missing accounts", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountEntitlements = createAccountEntitlementsService({ db });

  await seedTestEntitlements(db);

  // Act
  const addGrant = accountEntitlements.addAccountEntitlements({
    accountId: randomUUID(),
    entitlements: [
      {
        entitlement_id: "test.enabled",
        grant_id: randomUUID(),
        value: true,
      },
    ],
  });

  // Assert
  await assert.rejects(addGrant, /ACCOUNT_NOT_FOUND/);
});

test("account entitlements reject invalid grant values", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accountEntitlements = createAccountEntitlementsService({ db });
  const accountId = await createProjectedAccount(db);

  await seedTestEntitlements(db);

  // Act
  const addGrant = accountEntitlements.addAccountEntitlements({
    accountId,
    entitlements: [
      {
        entitlement_id: "test.enabled",
        grant_id: randomUUID(),
        value: 1,
      },
    ],
  });

  // Assert
  await assert.rejects(addGrant, /INVALID_ENTITLEMENT_VALUE/);
});

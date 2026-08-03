import {
  AccountEntitlementsUpdatedV1EventCheck,
  AccountEntitlementsUpdatedV1Type,
} from "@mstaicu/entitlements-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { getGrantsService } from "./index.mjs";

test("sets grants and resolves account entitlements", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;

  const accountId = randomUUID();
  const firstGrantId = randomUUID();
  const secondGrantId = randomUUID();
  const grants = getGrantsService({ pool });

  await pool.query(
    `
      INSERT INTO capabilities (id, type, strategy)
      VALUES
        ('test.enabled', 'boolean', 'boolean_or'),
        ('test.max', 'number', 'number_max'),
        ('test.sum', 'number', 'number_sum')
    `,
  );

  await pool.query(
    `
      INSERT INTO projected_accounts (account_id, version)
      VALUES ($1, 1)
    `,
    [accountId],
  );

  await grants.set({
    accountId,
    capabilities: [
      { id: "test.enabled", value: false },
      { id: "test.max", value: 10 },
      { id: "test.sum", value: 2 },
    ],
    grantId: firstGrantId,
  });

  await grants.set({
    accountId,
    capabilities: [
      { id: "test.enabled", value: true },
      { id: "test.max", value: 20 },
      { id: "test.sum", value: 3 },
    ],
    grantId: secondGrantId,
  });

  const result = await grants.set({
    accountId,
    capabilities: [
      { id: "test.max", value: 15 },
      { id: "test.sum", value: 4 },
    ],
    grantId: secondGrantId,
  });

  assert.deepEqual(result, {
    grant: {
      account_id: accountId,
      capabilities: [
        { id: "test.max", value: 15 },
        { id: "test.sum", value: 4 },
      ],
      id: secondGrantId,
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
    [AccountEntitlementsUpdatedV1Type, accountId],
  );

  assert.equal(AccountEntitlementsUpdatedV1EventCheck.Check(event), true);
  assert.deepEqual(event.data, {
    account: { id: accountId },
    entitlements: [
      { id: "test.enabled", value: false },
      { id: "test.max", value: 15 },
      { id: "test.sum", value: 6 },
    ],
    version: 3,
  });
});

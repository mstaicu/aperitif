import { AccountOpenedV1Type } from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

test("projects account opened events", async () => {
  await using db = await startPostgres();
  const accountId = randomUUID();

  await projectAccountOpenedV1({
    db,
    event: {
      data: {
        account: {
          id: accountId,
          type: "business",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
        version: 1,
      },
      datacontenttype: "application/json",
      id: randomUUID(),
      source: "/domains/accounts",
      specversion: "1.0",
      time: new Date().toISOString(),
      type: AccountOpenedV1Type,
    },
  });

  const {
    rows: [projectedAccount],
  } = await db.query(
    `
      SELECT account_id,
        type,
        version
      FROM projected_accounts
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    type: "business",
    version: "1",
  });
});

test("ignores stale account opened events", async () => {
  await using db = await startPostgres();
  const accountId = randomUUID();

  await db.query(
    `
      INSERT INTO projected_accounts (
        account_id,
        type,
        version
      )
      VALUES ($1, $2, $3)
    `,
    [accountId, "business", 2],
  );

  await projectAccountOpenedV1({
    db,
    event: {
      data: {
        account: {
          id: accountId,
          type: "personal",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
        version: 1,
      },
      datacontenttype: "application/json",
      id: randomUUID(),
      source: "/domains/accounts",
      specversion: "1.0",
      time: new Date().toISOString(),
      type: AccountOpenedV1Type,
    },
  });

  const {
    rows: [projectedAccount],
  } = await db.query(
    `
      SELECT account_id,
        type,
        version
      FROM projected_accounts
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    type: "business",
    version: "2",
  });
});

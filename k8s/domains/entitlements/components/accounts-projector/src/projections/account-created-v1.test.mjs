import { buildAccountCreatedV1Event } from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountCreatedV1 } from "./account-created-v1.mjs";

test("projects account state without allowing stale events to overwrite it", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accountId = randomUUID();

  await projectAccountCreatedV1({
    event: buildAccountCreatedV1Event(
      {
        account: {
          id: accountId,
          name: "Acme",
          type: "business",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
      },
      2,
    ),
    pool,
  });

  await projectAccountCreatedV1({
    event: buildAccountCreatedV1Event(
      {
        account: {
          id: accountId,
          name: "Personal",
          type: "personal",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
      },
      1,
    ),
    pool,
  });

  const {
    rows: [projectedAccount],
  } = await pool.query(
    `
      SELECT account_id,
        version
      FROM projected_accounts
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.deepEqual(projectedAccount, {
    account_id: accountId,
    version: "2",
  });
});

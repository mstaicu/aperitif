import { buildAccountOpenedV1Event } from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

test("projects account state without allowing stale events to overwrite it", async () => {
  await using db = await startPostgres();
  const accountId = randomUUID();

  await projectAccountOpenedV1({
    db,
    event: buildAccountOpenedV1Event(
      {
        account: {
          id: accountId,
          type: "business",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
      },
      2,
    ),
  });

  await projectAccountOpenedV1({
    db,
    event: buildAccountOpenedV1Event(
      {
        account: {
          id: accountId,
          type: "personal",
        },
        member: {
          role: "owner",
          user_id: randomUUID(),
        },
      },
      1,
    ),
  });

  const {
    rows: [projectedAccount],
  } = await db.query(
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

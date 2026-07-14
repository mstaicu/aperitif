import { buildAccountOpenedV1Event } from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountOpenedV1 } from "./account-opened-v1.mjs";

test("projects account members without allowing stale events to overwrite them", async () => {
  await using db = await startPostgres();
  const accountId = randomUUID();
  const userId = randomUUID();

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
          user_id: userId,
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
          role: "member",
          user_id: userId,
        },
      },
      1,
    ),
  });

  const {
    rows: [projectedMember],
  } = await db.query(
    `
      SELECT account_id,
        user_id,
        role,
        version
      FROM projected_account_members
      WHERE account_id = $1
        AND user_id = $2
    `,
    [accountId, userId],
  );

  assert.deepEqual(projectedMember, {
    account_id: accountId,
    role: "owner",
    user_id: userId,
    version: "2",
  });
});

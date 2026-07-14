import { buildAccountEntitlementsUpdatedV1Event } from "@mstaicu/entitlements-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../test/fixtures/postgres.mjs";
import { projectAccountEntitlementsUpdatedV1 } from "./account-entitlements-updated-v1.mjs";

test("projects account entitlements without allowing stale events to overwrite them", async () => {
  await using db = await startPostgres();
  const accountId = randomUUID();

  await projectAccountEntitlementsUpdatedV1({
    db,
    event: buildAccountEntitlementsUpdatedV1Event(
      {
        account: {
          id: accountId,
        },
        entitlements: [
          {
            id: "documents.create",
            value: true,
          },
          {
            id: "documents.max",
            value: 10,
          },
        ],
      },
      2,
    ),
  });

  await projectAccountEntitlementsUpdatedV1({
    db,
    event: buildAccountEntitlementsUpdatedV1Event(
      {
        account: {
          id: accountId,
        },
        entitlements: [
          {
            id: "documents.create",
            value: false,
          },
        ],
      },
      1,
    ),
  });

  const {
    rows: [projectedEntitlements],
  } = await db.query(
    `
      SELECT account_id,
        entitlements,
        version
      FROM projected_account_entitlements
      WHERE account_id = $1
    `,
    [accountId],
  );

  assert.deepEqual(projectedEntitlements, {
    account_id: accountId,
    entitlements: {
      "documents.create": true,
      "documents.max": 10,
    },
    version: "2",
  });
});

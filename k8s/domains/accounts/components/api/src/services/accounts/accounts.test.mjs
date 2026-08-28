import {
  AccountChangedV1Type,
  buildAccountV1Subject,
} from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccountsService } from "./index.mjs";

test("creates account ownership and lists only the caller's accounts", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const userId = randomUUID();

  const alpha = await accounts.createAccount({
    currentUserId: userId,
    name: "Alpha",
    type: "individual",
  });
  const zulu = await accounts.createAccount({
    currentUserId: userId,
    name: "Zulu",
    type: "organization",
  });
  await accounts.createAccount({
    currentUserId: randomUUID(),
    name: "Other",
    type: "individual",
  });

  assert.deepEqual(await accounts.listAccounts({ currentUserId: userId }), {
    accounts: [alpha.account, zulu.account],
  });

  const { rows: outbox } = await pool.query(
    `
      SELECT event,
        subject
      FROM outbox_events
      WHERE event #>> '{data,id}' = $1
      ORDER BY (event #>> '{data,revision}')::bigint
    `,
    [alpha.account.id],
  );

  assert.deepEqual(
    outbox.map(({ event, subject }) => [
      event.type,
      event.data.revision,
      event.data,
      subject,
    ]),
    [
      [
        AccountChangedV1Type,
        1,
        {
          ...alpha.account,
          members: [{ role: "owner", user_id: userId }],
          revision: 1,
        },
        buildAccountV1Subject(alpha.account.id),
      ],
    ],
  );
});

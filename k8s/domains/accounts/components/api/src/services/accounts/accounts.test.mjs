import {
  AccountCreatedV1Type,
  AccountMemberCreatedV1Type,
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
      SELECT event
      FROM outbox_events
      WHERE event #>> '{data,account,id}' = $1
        OR event #>> '{data,account_id}' = $1
      ORDER BY (event #>> '{data,version}')::bigint
    `,
    [alpha.account.id],
  );

  assert.deepEqual(
    outbox.map(({ event }) => [
      event.type,
      event.data.version,
      event.data.account ?? {
        account_id: event.data.account_id,
        member: event.data.member,
      },
    ]),
    [
      [AccountCreatedV1Type, 1, alpha.account],
      [
        AccountMemberCreatedV1Type,
        2,
        {
          account_id: alpha.account.id,
          member: { role: "owner", user_id: userId },
        },
      ],
    ],
  );
});

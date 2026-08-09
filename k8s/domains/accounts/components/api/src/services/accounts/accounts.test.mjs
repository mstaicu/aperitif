import {
  AccountCreatedV1Type,
  AccountMemberCreatedV1Type,
  AccountMemberDeletedV1Type,
  AccountMemberUpdatedV1Type,
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
    type: "personal",
  });
  const zulu = await accounts.createAccount({
    currentUserId: userId,
    name: "Zulu",
    type: "organization",
  });
  await accounts.createAccount({
    currentUserId: randomUUID(),
    name: "Other",
    type: "personal",
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

test("owners manage members without losing the last owner", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const ownerId = randomUUID();
  const memberId = randomUUID();
  const {
    account: { id: accountId },
  } = await accounts.createAccount({
    currentUserId: ownerId,
    name: "Acme",
    type: "organization",
  });

  assert.deepEqual(
    await accounts.createMember({
      accountId,
      currentUserId: ownerId,
      role: "member",
      userId: memberId,
    }),
    { member: { role: "member", user_id: memberId } },
  );

  assert.deepEqual(
    await accounts.listMembers({ accountId, currentUserId: ownerId }),
    {
      members: [
        { role: "owner", user_id: ownerId },
        { role: "member", user_id: memberId },
      ].sort((left, right) => left.user_id.localeCompare(right.user_id)),
    },
  );

  await assert.rejects(
    accounts.createMember({
      accountId,
      currentUserId: memberId,
      role: "member",
      userId: randomUUID(),
    }),
    /ACCOUNT_OWNER_REQUIRED/,
  );
  await assert.rejects(
    accounts.updateMember({
      accountId,
      currentUserId: ownerId,
      role: "member",
      userId: ownerId,
    }),
    /ACCOUNT_LAST_OWNER/,
  );
  await assert.rejects(
    accounts.deleteMember({
      accountId,
      currentUserId: ownerId,
      userId: ownerId,
    }),
    /ACCOUNT_LAST_OWNER/,
  );

  await accounts.updateMember({
    accountId,
    currentUserId: ownerId,
    role: "owner",
    userId: memberId,
  });
  await accounts.deleteMember({
    accountId,
    currentUserId: ownerId,
    userId: memberId,
  });

  assert.deepEqual(
    await accounts.listMembers({ accountId, currentUserId: ownerId }),
    { members: [{ role: "owner", user_id: ownerId }] },
  );

  const { rows: outbox } = await pool.query(
    `
      SELECT event
      FROM outbox_events
      WHERE event #>> '{data,account_id}' = $1
      ORDER BY (event #>> '{data,version}')::bigint
    `,
    [accountId],
  );

  assert.deepEqual(
    outbox.map(({ event }) => [
      event.type,
      event.data.version,
      event.data.member,
    ]),
    [
      [AccountMemberCreatedV1Type, 2, { role: "owner", user_id: ownerId }],
      [AccountMemberCreatedV1Type, 3, { role: "member", user_id: memberId }],
      [AccountMemberUpdatedV1Type, 4, { role: "owner", user_id: memberId }],
      [AccountMemberDeletedV1Type, 5, { role: "owner", user_id: memberId }],
    ],
  );
});

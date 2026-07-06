import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  AccountOpenedEventCheck,
  AccountOpenedType,
} from "@mstaicu/accounts-contracts";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccountsService } from "./index.mjs";

test("accounts create accounts owned by the current user", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accounts = createAccountsService({ db });
  const currentUserId = randomUUID();

  // Act
  const created = await accounts.createAccount({
    currentUserId,
    name: "Acme",
  });
  const listed = await accounts.listAccounts({ currentUserId });

  // Assert
  assert.equal(created.account.name, "Acme");
  assert.equal(typeof created.account.id, "string");
  assert.deepEqual(listed, {
    accounts: [created.account],
  });
});

test("accounts list only accounts for the current user", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accounts = createAccountsService({ db });
  const currentUserId = randomUUID();

  const alpha = await accounts.createAccount({
    currentUserId,
    name: "Alpha",
  });
  const zulu = await accounts.createAccount({
    currentUserId,
    name: "Zulu",
  });
  await accounts.createAccount({
    currentUserId: randomUUID(),
    name: "Other",
  });

  // Act
  const listed = await accounts.listAccounts({ currentUserId });

  // Assert
  assert.deepEqual(listed, {
    accounts: [alpha.account, zulu.account],
  });
});

test("accounts write account opened events to the outbox", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const accounts = createAccountsService({ db });
  const currentUserId = randomUUID();

  // Act
  const created = await accounts.createAccount({
    currentUserId,
    name: "Acme",
  });

  // Assert
  const {
    rows: [outbox],
  } = await db.query(
    `
      SELECT event
      FROM outbox_events
      WHERE event->>'type' = $1
        AND event #>> '{data,account,id}' = $2
    `,
    [AccountOpenedType, created.account.id],
  );

  assert.ok(outbox);
  assert.equal(AccountOpenedEventCheck.Check(outbox.event), true);
  assert.equal(outbox.event.type, AccountOpenedType);
  assert.equal(outbox.event.data.version, 1);
  assert.deepEqual(outbox.event.data.account, {
    id: created.account.id,
  });
  assert.deepEqual(outbox.event.data.member, {
    role: "owner",
    user_id: currentUserId,
  });
});

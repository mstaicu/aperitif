import {
  AccountCreatedV1EventCheck,
  AccountCreatedV1Type,
} from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccountsService } from "./index.mjs";

test("accounts create accounts owned by the current user", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const currentUserId = randomUUID();

  // Act
  const created = await accounts.createAccount({
    currentUserId,
    name: "Acme",
    type: "business",
  });
  const listed = await accounts.listAccounts({ currentUserId });

  // Assert
  assert.equal(created.account.name, "Acme");
  assert.equal(created.account.type, "business");
  assert.equal(typeof created.account.id, "string");
  assert.deepEqual(listed, {
    accounts: [created.account],
  });
});

test("accounts list only accounts for the current user", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const currentUserId = randomUUID();

  const alpha = await accounts.createAccount({
    currentUserId,
    name: "Alpha",
    type: "personal",
  });
  const zulu = await accounts.createAccount({
    currentUserId,
    name: "Zulu",
    type: "business",
  });
  await accounts.createAccount({
    currentUserId: randomUUID(),
    name: "Other",
    type: "personal",
  });

  // Act
  const listed = await accounts.listAccounts({ currentUserId });

  // Assert
  assert.deepEqual(listed, {
    accounts: [alpha.account, zulu.account],
  });
});

test("accounts write account created events to the outbox", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const currentUserId = randomUUID();

  // Act
  const created = await accounts.createAccount({
    currentUserId,
    name: "Acme",
    type: "business",
  });

  // Assert
  const {
    rows: [outbox],
  } = await pool.query(
    `
      SELECT event
      FROM outbox_events
      WHERE event->>'type' = $1
        AND event #>> '{data,account,id}' = $2
    `,
    [AccountCreatedV1Type, created.account.id],
  );

  assert.ok(outbox);
  assert.equal(AccountCreatedV1EventCheck.Check(outbox.event), true);
  assert.equal(outbox.event.type, AccountCreatedV1Type);
  assert.equal(outbox.event.data.version, 1);
  assert.deepEqual(outbox.event.data.account, {
    id: created.account.id,
    name: "Acme",
    type: "business",
  });
});

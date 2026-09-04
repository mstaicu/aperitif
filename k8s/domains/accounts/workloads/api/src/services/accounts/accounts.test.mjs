import { buildAccountV1Subject } from "@mstaicu/accounts-contracts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccountsService } from "./index.mjs";

test("creates account ownership and lists only the caller's accounts", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const accounts = createAccountsService({ pool });
  const userId = randomUUID();

  // Act
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
  const listed = await accounts.listAccounts({ currentUserId: userId });

  // Assert
  const { rows: outbox } = await pool.query(
    `
      SELECT event,
        subject
      FROM outbox_events
      WHERE event #>> '{data,id}' = $1
    `,
    [alpha.account.id],
  );

  assert.equal(outbox.length, 1);
  const [{ event, subject }] = outbox;
  const { rows: roles } = await pool.query(
    `
      SELECT role
      FROM account_member_roles
      WHERE account_id = $1
        AND user_id = $2
    `,
    [alpha.account.id, userId],
  );

  assert.deepEqual(listed, {
    accounts: [alpha.account, zulu.account],
  });
  assert.deepEqual(roles, [{ role: "owner" }]);
  assert.deepEqual(event.data, {
    ...alpha.account,
    members: [{ roles: ["owner"], user_id: userId }],
    revision: 1,
  });
  assert.equal(subject, buildAccountV1Subject(alpha.account.id));
});

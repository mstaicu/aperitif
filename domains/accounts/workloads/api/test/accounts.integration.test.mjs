import {
  buildAccountV1Subject,
  buildMembershipV1Subject,
  isAccountSnapshotV1,
  isMembershipSnapshotV1,
} from "@mstaicu/accounts-contracts";
import { generateKeyPair, SignJWT } from "jose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { buildApp } from "../src/app.mjs";
import { startPostgres } from "./fixtures/postgres.mjs";

test("creates an account, its owner membership, and their current snapshots", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwks: async () => publicKey,
    pool: postgres.pool,
  });
  const currentSubjectId = randomUUID();
  const accessToken = await new SignJWT()
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(currentSubjectId)
    .setExpirationTime("5m")
    .sign(privateKey);

  await app.ready();

  // Act
  const created = await app.inject({
    headers: { authorization: "Bearer " + accessToken },
    method: "POST",
    payload: { name: "Acme" },
    url: "/v1/accounts",
  });
  const listed = await app.inject({
    headers: { authorization: "Bearer " + accessToken },
    method: "GET",
    url: "/v1/accounts",
  });

  // Assert
  const createdAccount = created.json().account;
  const { rows: memberships } = await postgres.pool.query(
    "SELECT id, account_id, subject_id, role, status, version FROM account_memberships",
  );
  const { rows: outbox } = await postgres.pool.query(
    "SELECT id, headers, payload, subject FROM outbox_messages",
  );
  const accountSnapshot = outbox.find(({ payload }) =>
    isAccountSnapshotV1(payload),
  );
  const membershipSnapshot = outbox.find(({ payload }) =>
    isMembershipSnapshotV1(payload),
  );

  assert.equal(created.statusCode, 201);
  assert.equal(Number.isNaN(Date.parse(createdAccount.created_at)), false);
  assert.deepEqual(createdAccount, {
    created_at: createdAccount.created_at,
    id: createdAccount.id,
    name: "Acme",
    role: "owner",
  });
  assert.deepEqual(listed.json(), { accounts: [createdAccount] });
  assert.equal(memberships.length, 1);
  assert.deepEqual(memberships[0], {
    account_id: createdAccount.id,
    id: memberships[0].id,
    role: "owner",
    status: "active",
    subject_id: currentSubjectId,
    version: "1",
  });
  assert.equal(outbox.length, 2);
  assert.ok(accountSnapshot);
  assert.ok(membershipSnapshot);
  assert.equal(accountSnapshot.id, accountSnapshot.payload.id);
  assert.equal(
    accountSnapshot.headers["Content-Type"],
    "application/cloudevents+json",
  );
  assert.equal(
    accountSnapshot.subject,
    buildAccountV1Subject(createdAccount.id),
  );
  assert.deepEqual(accountSnapshot.payload.data, {
    created_at: createdAccount.created_at,
    id: createdAccount.id,
    name: "Acme",
    version: 1,
  });
  assert.equal(membershipSnapshot.id, membershipSnapshot.payload.id);
  assert.equal(
    membershipSnapshot.headers["Content-Type"],
    "application/cloudevents+json",
  );
  assert.equal(
    membershipSnapshot.subject,
    buildMembershipV1Subject(memberships[0].id),
  );
  assert.deepEqual(membershipSnapshot.payload.data, {
    account_id: createdAccount.id,
    id: memberships[0].id,
    role: "owner",
    status: "active",
    subject_id: currentSubjectId,
    version: 1,
  });
});

test("lists only accounts where the caller is an active member", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwks: async () => publicKey,
    pool: postgres.pool,
  });
  const currentSubjectId = randomUUID();
  const accessToken = await new SignJWT()
    .setProtectedHeader({ alg: "ES256" })
    .setSubject(currentSubjectId)
    .setExpirationTime("5m")
    .sign(privateKey);

  await app.ready();

  const {
    rows: [account],
  } = await postgres.pool.query(
    "INSERT INTO accounts (name) VALUES ($1) RETURNING id",
    ["Acme"],
  );
  await postgres.pool.query(
    `
      INSERT INTO account_memberships (account_id, subject_id, role, status)
      VALUES ($1, $2, 'owner', 'inactive')
    `,
    [account.id, currentSubjectId],
  );

  // Act
  const response = await app.inject({
    headers: { authorization: "Bearer " + accessToken },
    method: "GET",
    url: "/v1/accounts",
  });

  // Assert
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { accounts: [] });
});

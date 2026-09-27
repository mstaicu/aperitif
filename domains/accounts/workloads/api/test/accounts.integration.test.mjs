import {
  buildAccountV1Subject,
  isAccountSnapshotV1,
} from "@mstaicu/accounts-contracts";
import { generateKeyPair, SignJWT } from "jose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { buildApp } from "../src/app.mjs";
import { startPostgres } from "./fixtures/postgres.mjs";

test("creates an account, its owner membership, and its current snapshot", async () => {
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
    "SELECT account_id, subject_id, role FROM account_memberships",
  );
  const { rows: outbox } = await postgres.pool.query(
    "SELECT id, headers, payload, subject FROM outbox_messages",
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
  assert.deepEqual(memberships, [
    {
      account_id: createdAccount.id,
      role: "owner",
      subject_id: currentSubjectId,
    },
  ]);
  assert.equal(outbox.length, 1);
  assert.equal(isAccountSnapshotV1(outbox[0].payload), true);
  assert.equal(outbox[0].id, outbox[0].payload.id);
  assert.equal(
    outbox[0].headers["Content-Type"],
    "application/cloudevents+json",
  );
  assert.equal(outbox[0].subject, buildAccountV1Subject(createdAccount.id));
  assert.deepEqual(outbox[0].payload.data, {
    created_at: createdAccount.created_at,
    id: createdAccount.id,
    name: "Acme",
    version: 1,
  });
});

test("lists only accounts where the caller is a member", async () => {
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
      INSERT INTO account_memberships (account_id, subject_id, role)
      VALUES ($1, $2, 'owner')
    `,
    [account.id, randomUUID()],
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

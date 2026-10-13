import {
  buildAccountV1Subject,
  buildMembershipV1Subject,
  isAccountSnapshotV1,
  isMembershipSnapshotV1,
} from "@mstaicu/identity-contracts";
import { exportJWK, generateKeyPair } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { buildApp } from "../../app.mjs";

test("rejects missing and malformed bearer credentials when listing accounts", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwt: {
      jwks: { keys: [] },
      signingKey: { kid: "test", privateKey },
    },
    origin: "https://identity.test",
    pool: postgres.pool,
  });

  await app.ready();

  // Act
  const responses = await Promise.all(
    [undefined, "Bearer not-a-jwt"].map((authorization) => {
      const headers = authorization === undefined ? {} : { authorization };

      return app.inject({
        headers,
        method: "GET",
        url: "/v1/accounts",
      });
    }),
  );

  // Assert
  for (const response of responses) {
    assert.equal(response.statusCode, 401);
    assert.match(
      response.headers["content-type"] ?? "",
      /^application\/problem\+json/,
    );
    assert.equal(response.headers["www-authenticate"], "Bearer");
    assert.equal(response.json().type, "/problems/invalid-access-token");
  }
});

test("creates an account, its owner membership, and their current snapshots", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey, publicKey } = await generateKeyPair("ES256", {
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);

  Object.assign(publicJwk, { alg: "ES256", kid: "test", use: "sig" });

  await using app = buildApp({
    jwt: {
      jwks: { keys: [publicJwk] },
      signingKey: { kid: "test", privateKey },
    },
    origin: "https://identity.test",
    pool: postgres.pool,
  });
  const userId = randomUUID();
  const sessionToken = randomBytes(32).toString("base64url");

  await app.ready();
  await postgres.pool.query("INSERT INTO users (id) VALUES ($1)", [userId]);
  await postgres.pool.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days')
    `,
    [userId, createHash("sha256").update(sessionToken).digest()],
  );

  // Act
  const access = await app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "POST",
    url: "/v1/session/access-tokens",
  });
  const created = await app.inject({
    headers: { authorization: `Bearer ${access.json().access_token}` },
    method: "POST",
    payload: { name: "Acme" },
    url: "/v1/accounts",
  });
  const listed = await app.inject({
    headers: { authorization: `Bearer ${access.json().access_token}` },
    method: "GET",
    url: "/v1/accounts",
  });
  const {
    rows: [membership],
  } = await postgres.pool.query(
    "SELECT id, account_id, user_id, role, status, version FROM account_memberships",
  );
  await postgres.pool.query(
    "UPDATE account_memberships SET status = 'inactive' WHERE user_id = $1",
    [userId],
  );
  const afterDeactivation = await app.inject({
    headers: { authorization: `Bearer ${access.json().access_token}` },
    method: "GET",
    url: "/v1/accounts",
  });

  // Assert
  const createdAccount = created.json().account;
  const { rows: outbox } = await postgres.pool.query(
    "SELECT headers, id, payload, subject FROM outbox_messages",
  );
  const accountSnapshot = outbox.find(({ payload }) =>
    isAccountSnapshotV1(payload),
  );
  const membershipSnapshot = outbox.find(({ payload }) =>
    isMembershipSnapshotV1(payload),
  );

  assert.equal(access.statusCode, 200);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(createdAccount, {
    created_at: createdAccount.created_at,
    id: createdAccount.id,
    name: "Acme",
    role: "owner",
  });
  assert.deepEqual(listed.json(), { accounts: [createdAccount] });
  assert.deepEqual(afterDeactivation.json(), { accounts: [] });
  assert.deepEqual(membership, {
    account_id: createdAccount.id,
    id: membership.id,
    role: "owner",
    status: "active",
    user_id: userId,
    version: "1",
  });
  assert.equal(outbox.length, 2);
  assert.equal(
    accountSnapshot?.subject,
    buildAccountV1Subject(createdAccount.id),
  );
  assert.equal(
    membershipSnapshot?.subject,
    buildMembershipV1Subject(membership.id),
  );
  assert.deepEqual(accountSnapshot?.payload.data, {
    created_at: createdAccount.created_at,
    id: createdAccount.id,
    name: "Acme",
    version: 1,
  });
  assert.deepEqual(membershipSnapshot?.payload.data, {
    account_id: createdAccount.id,
    id: membership.id,
    role: "owner",
    status: "active",
    subject_id: userId,
    version: 1,
  });
});

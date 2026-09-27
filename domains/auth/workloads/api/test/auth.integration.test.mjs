import { generateKeyPair, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { buildApp } from "../src/app.mjs";
import { startPostgres } from "./fixtures/postgres.mjs";

test("returns secure passkey registration options", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwt: {
      jwks: { keys: [] },
      signingKey: { kid: "test", privateKey },
    },
    origin: "https://auth.test",
    pool: postgres.pool,
  });

  await app.ready();

  // Act
  const response = await app.inject({
    method: "POST",
    url: "/v1/passkeys/registration/options",
  });

  // Assert
  const options = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(options.rp.id, "auth.test");
  assert.equal(options.authenticatorSelection.residentKey, "required");
  assert.equal(options.authenticatorSelection.userVerification, "required");
});

test("issues and revokes independent sessions", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwt: {
      jwks: { keys: [] },
      signingKey: { kid: "test", privateKey },
    },
    origin: "https://auth.test",
    pool: postgres.pool,
  });
  const userId = randomUUID();
  const laptopToken = randomBytes(32).toString("base64url");
  const phoneToken = randomBytes(32).toString("base64url");

  await app.ready();
  await postgres.pool.query("INSERT INTO users (id) VALUES ($1)", [userId]);
  await postgres.pool.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES
        ($1, $2, NOW() + INTERVAL '30 days'),
        ($1, $3, NOW() + INTERVAL '30 days')
    `,
    [
      userId,
      createHash("sha256").update(laptopToken).digest(),
      createHash("sha256").update(phoneToken).digest(),
    ],
  );

  // Act
  const access = await app.inject({
    headers: { authorization: `Bearer ${laptopToken}` },
    method: "POST",
    url: "/v1/session/access-tokens",
  });
  const revocation = await app.inject({
    headers: { authorization: `Bearer ${phoneToken}` },
    method: "DELETE",
    url: "/v1/session",
  });
  const revokedAccess = await app.inject({
    headers: { authorization: `Bearer ${phoneToken}` },
    method: "POST",
    url: "/v1/session/access-tokens",
  });
  const remainingAccess = await app.inject({
    headers: { authorization: `Bearer ${laptopToken}` },
    method: "POST",
    url: "/v1/session/access-tokens",
  });

  // Assert
  const token = access.json();
  const { payload, protectedHeader } = await jwtVerify(
    token.access_token,
    publicKey,
  );

  assert.equal(access.statusCode, 200);
  assert.equal(token.expires_in, 300);
  assert.deepEqual(protectedHeader, { alg: "ES256", kid: "test" });
  assert.equal(payload.sub, userId);
  assert.equal(payload.exp, payload.iat + 300);
  assert.equal(revocation.statusCode, 204);
  assert.equal(revocation.body, "");
  assert.equal(revokedAccess.statusCode, 401);
  assert.equal(revokedAccess.headers["www-authenticate"], "Bearer");
  assert.equal(remainingAccess.statusCode, 200);
});

test("preserves a final passkey during concurrent removal", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { privateKey } = await generateKeyPair("ES256");
  await using app = buildApp({
    jwt: {
      jwks: { keys: [] },
      signingKey: { kid: "test", privateKey },
    },
    origin: "https://auth.test",
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
  const { rows: passkeys } = await postgres.pool.query(
    `
      INSERT INTO passkey_credentials (user_id, credential_id, public_key)
      VALUES
        ($1, $2, $3),
        ($1, $4, $5)
      RETURNING id
    `,
    [
      userId,
      randomBytes(32),
      randomBytes(65),
      randomBytes(32),
      randomBytes(65),
    ],
  );

  // Act
  const listed = await app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: "/v1/passkeys",
  });
  const renamed = await app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "PATCH",
    payload: { name: "Work laptop" },
    url: `/v1/passkeys/${passkeys[0].id}`,
  });
  const removals = await Promise.all(
    passkeys.map(({ id }) =>
      app.inject({
        headers: { authorization: `Bearer ${sessionToken}` },
        method: "DELETE",
        url: `/v1/passkeys/${id}`,
      }),
    ),
  );
  const { rows: remaining } = await postgres.pool.query(
    "SELECT id FROM passkey_credentials WHERE user_id = $1",
    [userId],
  );

  // Assert
  assert.equal(listed.statusCode, 200);
  assert.equal(listed.json().passkeys.length, 2);
  assert.equal(renamed.statusCode, 200);
  assert.equal(renamed.json().name, "Work laptop");
  assert.deepEqual(
    removals.map(({ statusCode }) => statusCode).sort(),
    [204, 409],
  );
  assert.equal(removals.find(({ statusCode }) => statusCode === 204)?.body, "");
  assert.equal(
    removals.find(({ statusCode }) => statusCode === 409)?.json().type,
    "/problems/last-authentication-method",
  );
  assert.equal(remaining.length, 1);
});

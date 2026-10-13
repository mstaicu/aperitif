import { generateKeyPair } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { buildApp } from "../../app.mjs";

test("returns secure passkey registration options", async () => {
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
  const response = await app.inject({
    method: "POST",
    url: "/v1/passkeys/registration/options",
  });

  // Assert
  const options = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.equal(options.rp.id, "identity.test");
  assert.equal(options.authenticatorSelection.residentKey, "required");
  assert.equal(options.authenticatorSelection.userVerification, "required");
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

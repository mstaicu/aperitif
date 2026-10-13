import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { buildApp } from "../../app.mjs";

test("issues JWTs verifiable through the public JWKS and revokes independent sessions", async () => {
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
  const jwks = await app.inject({
    method: "GET",
    url: "/.well-known/jwks.json",
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
    createLocalJWKSet(jwks.json()),
  );

  assert.equal(access.statusCode, 200);
  assert.equal(token.expires_in, 300);
  assert.equal(jwks.statusCode, 200);
  assert.equal(jwks.headers["cache-control"], "public, max-age=300");
  assert.equal("d" in jwks.json().keys[0], false);
  assert.deepEqual(protectedHeader, { alg: "ES256", kid: "test" });
  assert.equal(payload.sub, userId);
  assert.equal(payload.exp, Number(payload.iat) + 300);
  assert.equal(revocation.statusCode, 204);
  assert.equal(revocation.body, "");
  assert.equal(revokedAccess.statusCode, 401);
  assert.equal(revokedAccess.headers["www-authenticate"], "Bearer");
  assert.equal(remainingAccess.statusCode, 200);
});

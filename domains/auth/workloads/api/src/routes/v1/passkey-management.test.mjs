import { generateKeyPair } from "jose";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { buildApp } from "../../app.mjs";
import { createSession } from "../../services/sessions/create.mjs";

test("manages passkeys", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const userId = randomUUID();

  await pool.query("INSERT INTO users (id) VALUES ($1)", [userId]);

  const client = await pool.connect();
  const session = await createSession({ client, userId });
  client.release();

  const {
    rows: [personal, work],
  } = await pool.query(
    `
      INSERT INTO passkey_credentials (
        user_id,
        credential_id,
        name,
        public_key
      )
      VALUES
        ($1, $2, 'Personal passkey', $3),
        ($1, $4, 'Work passkey', $5)
      RETURNING id, credential_id
    `,
    [
      userId,
      randomBytes(32),
      randomBytes(65),
      randomBytes(32),
      randomBytes(65),
    ],
  );
  const { privateKey } = await generateKeyPair("ES256");
  const app = buildApp({
    jwks: { keys: [] },
    origin: "https://auth.test",
    pool,
    signingKey: { kid: "test", privateKey },
  });
  const authorization = `Bearer ${session.sessionToken}`;

  try {
    await app.ready();

    // Act
    const listed = await app.inject({
      headers: { authorization },
      method: "GET",
      url: "/v1/passkeys",
    });
    const options = await app.inject({
      headers: { authorization },
      method: "POST",
      url: "/v1/passkeys/options",
    });
    const renamed = await app.inject({
      body: { name: "Work MacBook" },
      headers: { authorization },
      method: "PATCH",
      url: `/v1/passkeys/${work.id}`,
    });
    const removed = await app.inject({
      headers: { authorization },
      method: "DELETE",
      url: `/v1/passkeys/${personal.id}`,
    });
    const finalRemoval = await app.inject({
      headers: { authorization },
      method: "DELETE",
      url: `/v1/passkeys/${work.id}`,
    });
    const unauthenticated = await app.inject({
      method: "GET",
      url: "/v1/passkeys",
    });

    // Assert
    assert.equal(listed.statusCode, 200);
    const passkeyNames = [];

    for (const passkey of listed.json().passkeys) {
      passkeyNames.push(passkey.name);
    }

    assert.deepEqual(passkeyNames.sort(), ["Personal passkey", "Work passkey"]);
    assert.equal(options.statusCode, 200);

    const excludedCredentialIds = [];

    for (const credential of options.json().excludeCredentials) {
      excludedCredentialIds.push(credential.id);
    }

    assert.deepEqual(
      excludedCredentialIds.sort(),
      [
        personal.credential_id.toString("base64url"),
        work.credential_id.toString("base64url"),
      ].sort(),
    );
    assert.equal(renamed.statusCode, 200);
    assert.equal(renamed.json().name, "Work MacBook");
    assert.equal(removed.statusCode, 204);
    assert.equal(finalRemoval.statusCode, 409);
    assert.equal(
      finalRemoval.json().type,
      "/problems/last-authentication-method",
    );
    assert.equal(unauthenticated.statusCode, 401);
  } finally {
    await app.close();
  }
});

import { generateKeyPair, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createAccessToken } from "./create-access-token.mjs";
import { createSession } from "./create.mjs";
import { revokeSession } from "./revoke.mjs";

test("sessions issue access tokens and revoke independently", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const sessions = {
    pool,
    signingKey: { kid: "test", privateKey },
  };
  const userId = randomUUID();

  await pool.query("INSERT INTO users (id) VALUES ($1)", [userId]);
  await pool.query("INSERT INTO operators (user_id) VALUES ($1)", [userId]);

  const client = await pool.connect();

  try {
    const laptop = await createSession({ client, userId });
    const phone = await createSession({ client, userId });

    // Act
    await revokeSession(sessions, { session_token: phone.sessionToken });
    const access = await createAccessToken(sessions, {
      session_token: laptop.sessionToken,
    });
    const { payload, protectedHeader } = await jwtVerify(
      access.access_token,
      publicKey,
    );
    const revokedAccess = createAccessToken(sessions, {
      session_token: phone.sessionToken,
    });

    // Assert
    assert.deepEqual(protectedHeader, { alg: "ES256", kid: "test" });
    assert.equal(payload.sub, userId);
    assert.equal(payload.operator, true);
    assert.ok(payload.iat);
    assert.equal(payload.exp, payload.iat + 300);
    assert.equal(laptop.expiresIn, 2_592_000);
    assert.equal(access.expires_in, 300);
    assert.equal(access.token_type, "Bearer");
    await assert.rejects(revokedAccess, /SESSION_NOT_FOUND/);
  } finally {
    client.release();
  }
});

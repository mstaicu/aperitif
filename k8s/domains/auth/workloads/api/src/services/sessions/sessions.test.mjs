import { createLocalJWKSet, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { createJwtFixture } from "../../../test/fixtures/jwt.mjs";
import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createSessionsService } from "./index.mjs";
import { createSession } from "./session.create.mjs";

test("sessions issue access tokens and revoke independently", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({
    pool,
    signingKey: jwt.signingKey,
  });
  const userId = randomUUID();

  await pool.query("INSERT INTO users (id) VALUES ($1)", [userId]);
  await pool.query("INSERT INTO operators (user_id) VALUES ($1)", [userId]);

  const client = await pool.connect();

  try {
    const laptop = await createSession({ client, userId });
    const phone = await createSession({ client, userId });

    const laptopAccess = await sessions.createAccessToken({
      session_token: laptop.sessionToken,
    });
    const { payload } = await jwtVerify(
      laptopAccess.access_token,
      createLocalJWKSet(jwt.jwks),
    );

    assert.equal(payload.sub, userId);
    assert.equal(payload.operator, true);
    assert.equal(laptop.expiresIn, 2_592_000);
    assert.equal(laptopAccess.expires_in, 300);
    assert.equal(laptopAccess.token_type, "Bearer");

    await sessions.revokeSession({ session_token: phone.sessionToken });
    await sessions.createAccessToken({ session_token: laptop.sessionToken });
    await assert.rejects(
      sessions.createAccessToken({ session_token: phone.sessionToken }),
      /SESSION_NOT_FOUND/,
    );
  } finally {
    client.release();
  }
});

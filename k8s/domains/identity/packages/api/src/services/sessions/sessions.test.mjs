import { createLocalJWKSet, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { createJwtFixture } from "../../../test/fixtures/jwt.mjs";
import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createSessionsService } from "./index.mjs";

/** @param {string} token */
const hashRefreshToken = (token) => createHash("sha256").update(token).digest();

/**
 * @param {import("pg").Pool} db
 * @param {string} [userId]
 */
const insertSession = async (db, userId = randomUUID()) => {
  const refreshToken = randomBytes(32).toString("base64url");

  await db.query("INSERT INTO users (id) VALUES ($1)", [userId]);

  const {
    rows: [session],
  } = await db.query(
    `
      INSERT INTO sessions (user_id, expires_at)
      VALUES ($1, NOW() + INTERVAL '30 days')
      RETURNING id
    `,
    [userId],
  );

  await db.query(
    `
      INSERT INTO session_refresh_tokens (session_id, token_hash)
      VALUES ($1, $2)
    `,
    [session.id, hashRefreshToken(refreshToken)],
  );

  return {
    refreshToken,
    userId,
  };
};

test("sessions issue access tokens", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({
    db,
    signingKey: jwt.signingKey,
  });

  const { refreshToken, userId } = await insertSession(db);

  // Act
  const { access_token: accessToken } = await sessions.createAccessToken({
    refresh_token: refreshToken,
  });

  // Assert
  const { payload } = await jwtVerify(accessToken, createLocalJWKSet(jwt.jwks));

  assert.equal(payload.sub, userId);
  assert.equal(payload.operator, undefined);
});

test("sessions include operator claims from database state", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({
    db,
    signingKey: jwt.signingKey,
  });

  const { refreshToken, userId } = await insertSession(db);

  await db.query("INSERT INTO operators (user_id) VALUES ($1)", [userId]);

  // Act
  const { access_token: operatorAccessToken } =
    await sessions.createAccessToken({
      refresh_token: refreshToken,
    });

  // Assert
  const { payload: operatorPayload } = await jwtVerify(
    operatorAccessToken,
    createLocalJWKSet(jwt.jwks),
  );

  assert.equal(operatorPayload.sub, userId);
  assert.equal(operatorPayload.operator, true);
});

test("sessions rotate refresh tokens and reject reused tokens", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({
    db,
    signingKey: jwt.signingKey,
  });

  const { refreshToken } = await insertSession(db);

  // Act
  const { refresh_token: rotatedRefreshToken } =
    await sessions.rotateRefreshToken({
      refresh_token: refreshToken,
    });

  // Assert
  assert.notEqual(rotatedRefreshToken, refreshToken);

  await sessions.createAccessToken({ refresh_token: rotatedRefreshToken });

  await assert.rejects(
    sessions.rotateRefreshToken({ refresh_token: refreshToken }),
    /SESSION_NOT_FOUND/,
  );

  await assert.rejects(
    sessions.createAccessToken({ refresh_token: rotatedRefreshToken }),
    /SESSION_NOT_FOUND/,
  );
});

test("sessions revoke the session represented by a refresh token", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({
    db,
    signingKey: jwt.signingKey,
  });

  const { refreshToken } = await insertSession(db);

  // Act
  await sessions.revokeSession({ refresh_token: refreshToken });

  // Assert
  await assert.rejects(
    sessions.createAccessToken({ refresh_token: refreshToken }),
    /SESSION_NOT_FOUND/,
  );

  await assert.rejects(
    sessions.revokeSession({ refresh_token: refreshToken }),
    /SESSION_NOT_FOUND/,
  );
});

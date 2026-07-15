import { createLocalJWKSet, jwtVerify } from "jose";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { createJwtFixture } from "../../../test/fixtures/jwt.mjs";
import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createSessionsService } from "./index.mjs";

test("sessions remain independent for every login", async () => {
  await using db = await startPostgres();
  const jwt = await createJwtFixture();
  const sessions = createSessionsService({ db, signingKey: jwt.signingKey });
  const userId = randomUUID();
  const laptop = randomBytes(32).toString("base64url");
  const phone = randomBytes(32).toString("base64url");

  await db.query("INSERT INTO users (id) VALUES ($1)", [userId]);
  await db.query(
    `
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES
        ($1, $2, NOW() + INTERVAL '30 days'),
        ($1, $3, NOW() + INTERVAL '30 days')
    `,
    [
      userId,
      createHash("sha256").update(laptop).digest(),
      createHash("sha256").update(phone).digest(),
    ],
  );
  await db.query("INSERT INTO operators (user_id) VALUES ($1)", [userId]);

  const [laptopAccess] = await Promise.all([
    sessions.createAccessToken({ refresh_token: laptop }),
    sessions.createAccessToken({ refresh_token: laptop }),
    sessions.createAccessToken({ refresh_token: phone }),
  ]);
  const { payload } = await jwtVerify(
    laptopAccess.access_token,
    createLocalJWKSet(jwt.jwks),
  );

  assert.equal(payload.sub, userId);
  assert.equal(payload.operator, true);
  assert.equal(laptopAccess.expires_in, 300);
  assert.equal(laptopAccess.token_type, "Bearer");

  await sessions.revokeSession({ refresh_token: phone });
  await sessions.createAccessToken({ refresh_token: laptop });
  await assert.rejects(
    sessions.createAccessToken({ refresh_token: phone }),
    /SESSION_NOT_FOUND/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPasskeysService } from "./index.mjs";

test("stores challenges and requires passkeys for the configured relying party", async () => {
  // Arrange
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const passkeys = createPasskeysService({
    origin: "https://auth.test",
    pool,
  });

  // Act
  const registration = await passkeys.createRegistrationOptions();
  const login = await passkeys.createAuthenticationOptions();

  // Assert
  const { rows: registrationChallenges } = await pool.query(
    "SELECT challenge FROM registration_challenges",
  );
  const { rows: authenticationChallenges } = await pool.query(
    "SELECT challenge FROM authentication_challenges",
  );

  assert.equal(registration.rp.id, "auth.test");
  assert.equal(registration.authenticatorSelection?.residentKey, "required");
  assert.equal(
    registration.authenticatorSelection?.userVerification,
    "required",
  );
  assert.equal(login.rpId, "auth.test");
  assert.equal(login.userVerification, "required");
  assert.deepEqual(registrationChallenges, [
    { challenge: Buffer.from(registration.challenge, "base64url") },
  ]);
  assert.deepEqual(authenticationChallenges, [
    { challenge: Buffer.from(login.challenge, "base64url") },
  ]);
});

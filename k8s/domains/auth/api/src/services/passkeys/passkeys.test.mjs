import assert from "node:assert/strict";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPasskeysService } from "./index.mjs";

test("passkeys require the configured origin and user verification", async () => {
  await using postgres = await startPostgres();
  const { pool } = postgres;
  const passkeys = createPasskeysService({
    origin: "https://auth.test",
    pool,
  });
  const registration = await passkeys.createRegistrationOptions();
  const login = await passkeys.createAuthenticationOptions();
  const {
    rows: [challenges],
  } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM registration_challenges) AS registrations,
      (SELECT COUNT(*)::int FROM authentication_challenges) AS authentications
  `);

  assert.equal(registration.rp.id, "auth.test");
  assert.equal(registration.authenticatorSelection?.residentKey, "required");
  assert.equal(
    registration.authenticatorSelection?.userVerification,
    "required",
  );
  assert.equal(login.rpId, "auth.test");
  assert.equal(login.userVerification, "required");
  assert.deepEqual(challenges, { authentications: 1, registrations: 1 });
});

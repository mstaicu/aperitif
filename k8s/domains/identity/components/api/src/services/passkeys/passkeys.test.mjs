import assert from "node:assert/strict";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPasskeysService } from "./index.mjs";

test("passkeys require the configured origin and user verification", async () => {
  await using db = await startPostgres();
  const passkeys = createPasskeysService({
    db,
    origin: "https://identity.test",
  });
  const [registration, login] = await Promise.all([
    passkeys.createRegisterChallenge(),
    passkeys.createLoginChallenge(),
  ]);
  const {
    rows: [challenges],
  } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM registration_challenges) AS registrations,
      (SELECT COUNT(*)::int FROM authentication_challenges) AS authentications
  `);

  assert.equal(registration.rp.id, "identity.test");
  assert.equal(registration.authenticatorSelection?.residentKey, "required");
  assert.equal(
    registration.authenticatorSelection?.userVerification,
    "required",
  );
  assert.equal(login.rpId, "identity.test");
  assert.equal(login.userVerification, "required");
  assert.deepEqual(challenges, { authentications: 1, registrations: 1 });
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { startPostgres } from "../../../test/fixtures/postgres.mjs";
import { createPasskeysService } from "./index.mjs";

const ORIGIN = "https://identity.test";

test("passkeys create registration challenges", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const passkeys = createPasskeysService({ db, origin: ORIGIN });

  // Act
  const challenge = await passkeys.createRegisterChallenge();

  // Assert
  assert.equal(challenge.rp.id, "identity.test");
  assert.equal(challenge.rp.name, "identity.test");
  assert.equal(challenge.user.name, challenge.user.displayName);
  assert.equal(challenge.authenticatorSelection?.residentKey, "required");
  assert.equal(challenge.authenticatorSelection?.userVerification, "required");
  assert.equal(typeof challenge.challenge, "string");
  assert.ok(challenge.challenge.length > 0);
});

test("passkeys create add-passkey challenges for existing users", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const passkeys = createPasskeysService({ db, origin: ORIGIN });
  const userId = randomUUID();

  await db.query("INSERT INTO users (id) VALUES ($1)", [userId]);

  // Act
  const challenge = await passkeys.createPasskeyChallenge({ userId });

  // Assert
  assert.equal(challenge.rp.id, "identity.test");
  assert.equal(challenge.user.name, userId);
  assert.equal(challenge.user.displayName, userId);
  assert.equal(challenge.authenticatorSelection?.residentKey, "required");
  assert.equal(challenge.authenticatorSelection?.userVerification, "required");
  assert.equal(typeof challenge.challenge, "string");
  assert.ok(challenge.challenge.length > 0);
});

test("passkeys create login challenges", async (t) => {
  // Arrange
  const db = await startPostgres(t);
  const passkeys = createPasskeysService({ db, origin: ORIGIN });

  // Act
  const challenge = await passkeys.createLoginChallenge();

  // Assert
  assert.equal(challenge.rpId, "identity.test");
  assert.equal(challenge.userVerification, "required");
  assert.equal(typeof challenge.challenge, "string");
  assert.ok(challenge.challenge.length > 0);
});

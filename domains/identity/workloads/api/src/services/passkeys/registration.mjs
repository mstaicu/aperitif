import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";

import { createSession } from "../sessions/create.mjs";

/**
 * Deletes and returns the challenge. Call before BEGIN.
 * @param {{ client: import("pg").PoolClient }} resources
 * @param {import("@simplewebauthn/server").RegistrationResponseJSON} credential
 */
export const getRegistrationChallenge = async ({ client }, credential) => {
  let challenge;

  try {
    ({ challenge } = decodeClientDataJSON(credential.response.clientDataJSON));
  } catch {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  if (typeof challenge !== "string") {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  const {
    rows: [challengeRow],
  } = await client.query(
    `
      DELETE FROM registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING principal_id, challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (!challengeRow) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  return /** @type {{ principal_id: string, challenge: Buffer }} */ (
    challengeRow
  );
};

/**
 * Requires the caller's active transaction. For additions, the caller must first
 * lock the principal, verify their existing passkey, and validate their session.
 * @param {{ client: import("pg").PoolClient, origin: string }} resources
 * @param {{
 *   challenge: { principal_id: string, challenge: Buffer },
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 *   name?: string,
 *   principalId?: string,
 * }} args
 */
export const register = async (
  { client, origin },
  { challenge: challengeRow, credential, name = "Passkey", principalId },
) => {
  if (!name || name.length < 1 || [...name].length > 100) {
    throw new Error("INVALID_PASSKEY_NAME");
  }

  if (principalId && challengeRow.principal_id !== principalId) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const { hostname, origin: expectedOrigin } = new URL(origin);

  let verification;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challengeRow.challenge.toString("base64url"),
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
      response: credential,
    });
  } catch {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  if (!verification.verified) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const registrationCredential = verification.registrationInfo.credential;

  if (!principalId) {
    const {
      rows: [principal],
    } = await client.query(
      `
        INSERT INTO principals (id)
        VALUES ($1)
        ON CONFLICT DO NOTHING
        RETURNING id
      `,
      [challengeRow.principal_id],
    );

    if (!principal) {
      throw new Error("PRINCIPAL_ALREADY_REGISTERED");
    }
  }

  await client.query(
    `
      INSERT INTO passkey_credentials (
        principal_id,
        credential_id,
        name,
        public_key,
        sign_count
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      challengeRow.principal_id,
      Buffer.from(registrationCredential.id, "base64url"),
      name,
      Buffer.from(registrationCredential.publicKey),
      registrationCredential.counter,
    ],
  );

  if (principalId) {
    return null;
  }

  return createSession({
    client,
    principalId: challengeRow.principal_id,
  });
};

import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { DatabaseError } from "pg";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {{
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 *   name: string,
 *   userId: string,
 * }} args
 */
export async function addPasskey(
  { origin, pool },
  { credential, name, userId },
) {
  const normalizedName = name.trim();

  if (normalizedName.length < 1 || normalizedName.length > 100) {
    throw new Error("INVALID_PASSKEY_NAME");
  }

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
  } = await pool.query(
    `
      DELETE FROM registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING user_id, challenge
    `,
    [Buffer.from(challenge, "base64url")],
  );

  if (
    !challengeRow?.user_id ||
    !challengeRow?.challenge ||
    challengeRow.user_id !== userId
  ) {
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

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const registrationCredential = verification.registrationInfo.credential;

  try {
    const {
      rows: [passkey],
    } = await pool.query(
      `
        INSERT INTO passkey_credentials (
          user_id,
          credential_id,
          name,
          public_key,
          sign_count
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, created_at
      `,
      [
        userId,
        Buffer.from(registrationCredential.id, "base64url"),
        normalizedName,
        Buffer.from(registrationCredential.publicKey),
        registrationCredential.counter,
      ],
    );

    return passkey;
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23505") {
      throw new Error("CREDENTIAL_ALREADY_EXISTS", { cause: err });
    }

    throw err;
  }
}

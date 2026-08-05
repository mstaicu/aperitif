import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { DatabaseError } from "pg";

import { createSession } from "../sessions/session.create.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {import("@simplewebauthn/server").RegistrationResponseJSON} credential
 */
const verifyPasskeyRegistration = async ({ origin, pool }, credential) => {
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

  if (!challengeRow?.user_id || !challengeRow?.challenge) {
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

  return {
    credentialId: Buffer.from(registrationCredential.id, "base64url"),
    publicKey: Buffer.from(registrationCredential.publicKey),
    signCount: registrationCredential.counter,
    userId: /** @type {string} */ (challengeRow.user_id),
  };
};

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @returns {(input: {
 *   credential: import("@simplewebauthn/server").RegistrationResponseJSON,
 * }) => Promise<{ refresh_token: string }>}
 */
export const register =
  ({ origin, pool }) =>
  async ({ credential }) => {
    let client;

    try {
      const registration = await verifyPasskeyRegistration(
        { origin, pool },
        credential,
      );

      client = await pool.connect();

      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `
          INSERT INTO users (id)
          VALUES ($1)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [registration.userId],
      );

      if (!user) {
        throw new Error("USER_ALREADY_REGISTERED");
      }

      await client.query(
        `
          INSERT INTO passkey_credentials
          (
            user_id,
            credential_id,
            public_key,
            sign_count
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          registration.userId,
          registration.credentialId,
          registration.publicKey,
          registration.signCount,
        ],
      );

      const session = await createSession({
        client,
        userId: registration.userId,
      });

      await client.query("COMMIT");

      return {
        refresh_token: session.refreshToken,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError && err.code === "23505") {
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }
      throw err;
    } finally {
      client?.release();
    }
  };

import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

import { createError } from "../../platform/problem-details.mjs";

/**
 * @typedef {import("@simplewebauthn/server").RegistrationResponseJSON} RegistrationResponseJSON
 */

/**
 * @typedef {Object} RegisterInput
 * @property {RegistrationResponseJSON} credential
 */

const generateSessionToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @param {RegistrationResponseJSON} credential
 */
const verifyPasskeyRegistration = async ({ origin, pool }, credential) => {
  if (credential.id !== credential.rawId) {
    throw createError("INVALID_REGISTRATION_RESPONSE");
  }

  let clientDataJSON;

  try {
    clientDataJSON = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, "base64url").toString(
        "utf8",
      ),
    );
  } catch {
    throw createError("INVALID_REGISTRATION_RESPONSE");
  }

  if (
    !clientDataJSON ||
    typeof clientDataJSON !== "object" ||
    typeof clientDataJSON.challenge !== "string"
  ) {
    throw createError("INVALID_REGISTRATION_RESPONSE");
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
    [Buffer.from(clientDataJSON.challenge, "base64url")],
  );

  if (!challengeRow?.user_id || !challengeRow?.challenge) {
    throw createError("REGISTRATION_VERIFICATION_FAILED");
  }

  const { hostname, origin: expectedOrigin } = new URL(origin);

  let verification;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challengeRow.challenge.toString("base64url"),
      expectedOrigin,
      expectedRPID: hostname,
      requireUserVerification: true,
      response: {
        ...credential,
        clientExtensionResults: credential.clientExtensionResults ?? {},
      },
    });
  } catch {
    throw createError("REGISTRATION_VERIFICATION_FAILED");
  }

  if (!verification?.verified || !verification.registrationInfo?.credential) {
    throw createError("REGISTRATION_VERIFICATION_FAILED");
  }

  const registrationCredential = verification.registrationInfo.credential;

  if (
    typeof registrationCredential.id !== "string" ||
    !registrationCredential.publicKey
  ) {
    throw createError("INVALID_REGISTRATION_RESPONSE");
  }

  if (credential.id !== registrationCredential.id) {
    throw createError("INVALID_REGISTRATION_RESPONSE");
  }

  return {
    credentialId: Buffer.from(registrationCredential.id, "base64url"),
    publicKey: Buffer.from(registrationCredential.publicKey),
    signCount: registrationCredential.counter,
    userId: /** @type {string} */ (challengeRow.user_id),
  };
};

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
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
        throw createError("USER_ALREADY_REGISTERED");
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

      const { hash, token } = generateSessionToken();

      const {
        rows: [session],
      } = await client.query(
        `
          INSERT INTO sessions 
          (
            user_id,
            token_hash,
            expires_at
          )
          VALUES ($1, $2, NOW() + INTERVAL '30 days')
          RETURNING id
        `,
        [registration.userId, hash],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "passkey_registered",
          level: "info",
          session_id: session.id,
          user_id: registration.userId,
        }),
      );

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError && err.code === "23505") {
        throw createError("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (Error.isError(err) &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw createError("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

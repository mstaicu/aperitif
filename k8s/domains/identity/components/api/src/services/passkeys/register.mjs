import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

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
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @param {RegistrationResponseJSON} credential
 */
const verifyPasskeyRegistration = async ({ db, origin }, credential) => {
  if (credential.id !== credential.rawId) {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  let clientDataJSON;

  try {
    clientDataJSON = JSON.parse(
      Buffer.from(credential.response.clientDataJSON, "base64url").toString(
        "utf8",
      ),
    );
  } catch {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  if (
    !clientDataJSON ||
    typeof clientDataJSON !== "object" ||
    typeof clientDataJSON.challenge !== "string"
  ) {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  const {
    rows: [challengeRow],
  } = await db.query(
    `
      DELETE FROM registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING user_id, challenge
    `,
    [Buffer.from(clientDataJSON.challenge, "base64url")],
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
      response: {
        ...credential,
        clientExtensionResults: credential.clientExtensionResults ?? {},
      },
    });
  } catch {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  if (!verification?.verified || !verification.registrationInfo?.credential) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const registrationCredential = verification.registrationInfo.credential;

  if (
    typeof registrationCredential.id !== "string" ||
    !registrationCredential.publicKey
  ) {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  if (credential.id !== registrationCredential.id) {
    throw new Error("INVALID_REGISTRATION_RESPONSE");
  }

  return {
    credentialId: Buffer.from(registrationCredential.id, "base64url"),
    publicKey: Buffer.from(registrationCredential.publicKey),
    signCount: registrationCredential.counter,
    userId: /** @type {string} */ (challengeRow.user_id),
  };
};

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
 */
export const register =
  ({ db, origin }) =>
  async ({ credential }) => {
    let client;

    try {
      const registration = await verifyPasskeyRegistration(
        { db, origin },
        credential,
      );

      client = await db.connect();

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
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      if (
        (err instanceof DatabaseError &&
          (err.code?.startsWith("08") ||
            err.code === "57P01" ||
            err.code === "57P03" ||
            err.code === "53300")) ||
        (err instanceof Error &&
          "code" in err &&
          "syscall" in err &&
          typeof err.code === "string")
      ) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

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

/**
 * @typedef {Object} CreatePasskeyInput
 * @property {RegistrationResponseJSON} credential
 * @property {string} userId
 */

const generateRefreshToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @param {RegistrationResponseJSON} credential
 */
const verifyPasskeyRegistration = async (runtime, credential) => {
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
  } = await runtime.db.query(
    `
      DELETE FROM registration_challenges
      WHERE challenge = $1
        AND expires_at > NOW()
      RETURNING user_id, email, challenge
    `,
    [Buffer.from(clientDataJSON.challenge, "base64url")],
  );

  if (!challengeRow?.user_id || !challengeRow?.challenge) {
    throw new Error("REGISTRATION_VERIFICATION_FAILED");
  }

  const { hostname, origin } = new URL(runtime.app.origin);

  let verification;

  try {
    verification = await verifyRegistrationResponse({
      expectedChallenge: challengeRow.challenge.toString("base64url"),
      expectedOrigin: origin,
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
    email: /** @type {string} */ (challengeRow.email),
    publicKey: Buffer.from(registrationCredential.publicKey),
    signCount: registrationCredential.counter,
    userId: /** @type {string} */ (challengeRow.user_id),
  };
};

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
 */
export const register =
  (runtime) =>
  async ({ credential }) => {
    let client;

    try {
      const registration = await verifyPasskeyRegistration(runtime, credential);

      client = await runtime.db.connect();

      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `
          INSERT INTO users (id, email)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          RETURNING id
        `,
        [registration.userId, registration.email],
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

      const { hash, token } = generateRefreshToken();

      const {
        rows: [session],
      } = await client.query(
        `
          INSERT INTO sessions 
          (
            user_id,
            expires_at
          )
          VALUES ($1, NOW() + INTERVAL '30 days')
          RETURNING id
        `,
        [registration.userId],
      );

      await client.query(
        `
          INSERT INTO session_refresh_tokens (
            session_id,
            token_hash
          )
          VALUES ($1, $2)
        `,
        [session.id, hash],
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

      if (err instanceof DatabaseError && err.code?.startsWith("08")) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

/**
 * @param {import("../../platform/runtime.mjs").Runtime} runtime
 * @returns {(input: CreatePasskeyInput) => Promise<void>}
 */
export const createPasskey =
  (runtime) =>
  async ({ credential, userId }) => {
    let client;

    try {
      const registration = await verifyPasskeyRegistration(runtime, credential);

      if (registration.userId !== userId) {
        throw new Error("FORBIDDEN");
      }

      client = await runtime.db.connect();
      await client.query("BEGIN");

      const {
        rows: [user],
      } = await client.query(
        `
          SELECT id
          FROM users
          WHERE id = $1
          FOR UPDATE
        `,
        [userId],
      );

      if (!user) {
        throw new Error("USER_NOT_FOUND");
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
          userId,
          registration.credentialId,
          registration.publicKey,
          registration.signCount,
        ],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "passkey_created",
          level: "info",
          user_id: userId,
        }),
      );
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (err instanceof DatabaseError && err.code === "23505") {
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      if (err instanceof DatabaseError && err.code?.startsWith("08")) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

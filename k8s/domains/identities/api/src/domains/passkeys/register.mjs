import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @typedef {import("@simplewebauthn/server").RegistrationResponseJSON} RegistrationResponseJSON
 */

/**
 * @typedef {Object} RegisterInput
 * @property {RegistrationResponseJSON} credential
 */

const generateRefreshToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
 */
export const register =
  (ctx) =>
  async ({ credential }) => {
    const { app, persistence } = ctx;

    const { hostname, origin } = new URL(app.origin);

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

    let challengeBytes;

    try {
      challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
    } catch {
      throw new Error("INVALID_REGISTRATION_RESPONSE");
    }

    let client;

    try {
      const {
        rows: [challengeRow],
      } = await persistence.db.query(
        `
          DELETE FROM challenges
          WHERE challenge = $1
            AND user_id IS NOT NULL
            AND expires_at > NOW()
          RETURNING user_id, challenge
        `,
        [challengeBytes],
      );

      if (!challengeRow?.user_id || !challengeRow?.challenge) {
        throw new Error("REGISTRATION_VERIFICATION_FAILED");
      }

      const expectedChallenge = challengeRow.challenge.toString("base64url");

      let verification;

      try {
        verification = await verifyRegistrationResponse({
          expectedChallenge,
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

      if (
        !verification?.verified ||
        !verification.registrationInfo?.credential
      ) {
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

      const credentialId = Buffer.from(registrationCredential.id, "base64url");
      const publicKey = Buffer.from(registrationCredential.publicKey);
      const signCount = registrationCredential.counter;

      client = await persistence.db.connect();
      await client.query("BEGIN");

      /** @type {string} */
      const userId = challengeRow.user_id;

      await client.query(
        `
          INSERT INTO users (id)
          VALUES ($1)
          ON CONFLICT DO NOTHING
        `,
        [userId],
      );

      await client.query(
        `
          INSERT INTO credentials
          (
            user_id,
            credential_id,
            public_key,
            sign_count
          )
          VALUES ($1, $2, $3, $4)
        `,
        [userId, credentialId, publicKey, signCount],
      );

      const { hash, token } = generateRefreshToken();

      await client.query(
        `
          INSERT INTO sessions 
          (
            user_id,
            refresh_token_hash,
            expires_at
          )
          VALUES ($1, $2, NOW() + INTERVAL '30 days')
        `,
        [userId, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      /** @type {any} */
      const error = err;

      if (error?.code === "23505") {
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

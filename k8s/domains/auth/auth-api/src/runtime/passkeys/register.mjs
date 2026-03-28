import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { generateRefreshToken } from "../../api/versions/v1/routes/passkeys/shared.mjs";

/**
 * @typedef {import("@simplewebauthn/server").RegistrationResponseJSON} RegistrationResponseJSON
 */

/**
 * @typedef {Object} RegisterInput
 * @property {RegistrationResponseJSON} credential
 */

/**
 * @param {import('../../fastify.js').Ctx} ctx
 * @returns {(input: RegisterInput) => Promise<{refresh_token: string}>}
 */
export const register =
  (ctx) =>
  async ({ credential }) => {
    const { conf, db } = ctx;

    const { hostname, origin } = new URL(conf.origin);

    if (credential.id !== credential.rawId) {
      throw new Error("INVALID_CREDENTIAL");
    }

    let clientDataJSON;

    try {
      clientDataJSON = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64url").toString(
          "utf8",
        ),
      );
    } catch {
      throw new Error("INVALID_CLIENT_DATA");
    }

    if (
      !clientDataJSON ||
      typeof clientDataJSON !== "object" ||
      typeof clientDataJSON.challenge !== "string"
    ) {
      throw new Error("INVALID_CLIENT_DATA");
    }

    let challengeBytes;

    try {
      challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
    } catch {
      throw new Error("INVALID_CHALLENGE");
    }

    const {
      rows: [challengeRow],
    } = await db.query(
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
      throw new Error("CHALLENGE_NOT_FOUND");
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
      throw new Error("VERIFICATION_FAILED");
    }

    if (!verification?.verified || !verification.registrationInfo?.credential) {
      throw new Error("NOT_VERIFIED");
    }

    const registrationCredential = verification.registrationInfo.credential;

    if (
      typeof registrationCredential.id !== "string" ||
      !registrationCredential.publicKey
    ) {
      throw new Error("INVALID_REGISTRATION_CREDENTIAL");
    }

    if (credential.id !== registrationCredential.id) {
      throw new Error("CREDENTIAL_ID_MISMATCH");
    }

    const credentialId = Buffer.from(registrationCredential.id, "base64url");
    const publicKey = Buffer.from(registrationCredential.publicKey);
    const signCount = registrationCredential.counter;

    const client = await db.connect();

    try {
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
      await client.query("ROLLBACK");

      /** @type {any} */
      const error = err;

      if (error?.code === "23505") {
        throw new Error("CREDENTIAL_ALREADY_EXISTS", {
          cause: err,
        });
      }

      throw err;
    } finally {
      client.release();
    }
  };

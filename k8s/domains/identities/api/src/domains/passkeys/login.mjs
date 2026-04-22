import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";

import { isDatabaseUnavailable } from "../../platform/persistence/errors.mjs";

/**
 * @typedef {import("@simplewebauthn/server").AuthenticationResponseJSON} AuthenticationResponseJSON
 */

/**
 * @typedef {Object} LoginInput
 * @property {AuthenticationResponseJSON} authentication
 */

const generateRefreshToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {import("../../platform/context.mjs").Context} ctx
 * @returns {(input: LoginInput) => Promise<{refresh_token: string}>}
 */
export const login =
  (ctx) =>
  async ({ authentication }) => {
    const { app, persistence } = ctx;

    const { hostname, origin } = new URL(app.origin);

    if (authentication.id !== authentication.rawId) {
      throw new Error("INVALID_CREDENTIAL");
    }

    let clientDataJSON;

    try {
      clientDataJSON = JSON.parse(
        Buffer.from(
          authentication.response.clientDataJSON,
          "base64url",
        ).toString("utf8"),
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

    let client;

    try {
      const {
        rows: [challengeRow],
      } = await persistence.db.query(
        `
          DELETE FROM challenges
          WHERE challenge = $1
            AND user_id IS NULL
            AND expires_at > NOW()
          RETURNING challenge
        `,
        [challengeBytes],
      );

      if (!challengeRow) {
        throw new Error("CHALLENGE_NOT_FOUND");
      }

      client = await persistence.db.connect();
      await client.query("BEGIN");

      const {
        rows: [credential],
      } = await client.query(
        `
          SELECT user_id, credential_id, public_key, sign_count
          FROM credentials
          WHERE credential_id = $1
          FOR UPDATE
        `,
        [Buffer.from(authentication.id, "base64url")],
      );

      if (!credential) {
        throw new Error("CREDENTIAL_NOT_FOUND");
      }

      if (authentication.response.userHandle) {
        const userHandle = Buffer.from(
          authentication.response.userHandle,
          "base64url",
        );

        const expectedHandle = Buffer.from(
          credential.user_id.replace(/-/g, ""),
          "hex",
        );

        if (!userHandle.equals(expectedHandle)) {
          throw new Error("INVALID_USER_HANDLE");
        }
      }

      let verification;

      try {
        verification = await verifyAuthenticationResponse({
          credential: {
            counter: Number(credential.sign_count),
            id: credential.credential_id.toString("base64url"),
            publicKey: new Uint8Array(credential.public_key),
          },
          expectedChallenge: challengeRow.challenge.toString("base64url"),
          expectedOrigin: origin,
          expectedRPID: hostname,
          requireUserVerification: true,
          response: authentication,
        });
      } catch {
        throw new Error("VERIFICATION_FAILED");
      }

      if (!verification.verified) {
        throw new Error("NOT_VERIFIED");
      }

      const newCounter = verification.authenticationInfo.newCounter;
      const oldCounter = Number(credential.sign_count);

      if (newCounter > 0 && newCounter <= oldCounter) {
        throw new Error("COUNTER_REPLAY");
      }

      await client.query(
        `
          UPDATE credentials
          SET sign_count =
            CASE
              WHEN $2 > sign_count THEN $2
              ELSE sign_count
            END
          WHERE credential_id = $1
        `,
        [credential.credential_id, newCounter],
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
        [credential.user_id, hash],
      );

      await client.query("COMMIT");

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

      if (isDatabaseUnavailable(err)) {
        throw new Error("DATABASE_UNAVAILABLE", { cause: err });
      }

      throw err;
    } finally {
      client?.release();
    }
  };

import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";

import { createSession } from "../sessions/session.create.mjs";

/**
 * @param {{ origin: string, pool: import("pg").Pool }} resources
 * @returns {(authentication: import("@simplewebauthn/server").AuthenticationResponseJSON) => Promise<{
 *   expires_in: number,
 *   session_token: string,
 * }>}
 */
export const authenticate =
  ({ origin, pool }) =>
  async (authentication) => {
    let challenge;

    try {
      ({ challenge } = decodeClientDataJSON(
        authentication.response.clientDataJSON,
      ));
    } catch {
      throw new Error("INVALID_AUTHENTICATION_RESPONSE");
    }

    if (typeof challenge !== "string") {
      throw new Error("INVALID_AUTHENTICATION_RESPONSE");
    }

    let client;

    try {
      const {
        rows: [challengeRow],
      } = await pool.query(
        `
          DELETE FROM authentication_challenges
          WHERE challenge = $1
            AND expires_at > NOW()
          RETURNING challenge
        `,
        [Buffer.from(challenge, "base64url")],
      );

      if (!challengeRow) {
        throw new Error("AUTHENTICATION_FAILED");
      }

      client = await pool.connect();
      await client.query("BEGIN");

      const {
        rows: [credential],
      } = await client.query(
        `
          SELECT user_id, credential_id, public_key, sign_count
          FROM passkey_credentials
          WHERE credential_id = $1
          FOR UPDATE
        `,
        [Buffer.from(authentication.id, "base64url")],
      );

      if (!credential) {
        throw new Error("AUTHENTICATION_FAILED");
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
          throw new Error("AUTHENTICATION_FAILED");
        }
      }

      const { hostname, origin: expectedOrigin } = new URL(origin);

      let verification;

      try {
        verification = await verifyAuthenticationResponse({
          credential: {
            counter: Number(credential.sign_count),
            id: credential.credential_id.toString("base64url"),
            publicKey: new Uint8Array(credential.public_key),
          },
          expectedChallenge: challengeRow.challenge.toString("base64url"),
          expectedOrigin,
          expectedRPID: hostname,
          requireUserVerification: true,
          response: authentication,
        });
      } catch {
        throw new Error("AUTHENTICATION_FAILED");
      }

      if (!verification.verified) {
        throw new Error("AUTHENTICATION_FAILED");
      }

      const newCounter = verification.authenticationInfo.newCounter;

      await client.query(
        `
          UPDATE passkey_credentials
          SET sign_count = $2
          WHERE credential_id = $1
        `,
        [credential.credential_id, newCounter],
      );

      const session = await createSession({
        client,
        userId: credential.user_id,
      });

      await client.query("COMMIT");

      return {
        expires_in: session.expiresIn,
        session_token: session.sessionToken,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client?.release();
    }
  };

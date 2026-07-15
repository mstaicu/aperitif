import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { createHash, randomBytes } from "node:crypto";
import { DatabaseError } from "pg";

/**
 * @typedef {import("@simplewebauthn/server").AuthenticationResponseJSON} AuthenticationResponseJSON
 */

/**
 * @typedef {Object} LoginInput
 * @property {AuthenticationResponseJSON} authentication
 */

const generateSessionToken = () => {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest();

  return { hash, token };
};

/**
 * @param {{ db: import("pg").Pool, origin: string }} resources
 * @returns {(input: LoginInput) => Promise<{refresh_token: string}>}
 */
export const login =
  ({ db, origin }) =>
  async ({ authentication }) => {
    if (authentication.id !== authentication.rawId) {
      throw new Error("INVALID_AUTHENTICATION_RESPONSE");
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
      throw new Error("INVALID_AUTHENTICATION_RESPONSE");
    }

    if (
      !clientDataJSON ||
      typeof clientDataJSON !== "object" ||
      typeof clientDataJSON.challenge !== "string"
    ) {
      throw new Error("INVALID_AUTHENTICATION_RESPONSE");
    }

    let client;

    try {
      const {
        rows: [challengeRow],
      } = await db.query(
        `
          DELETE FROM authentication_challenges
          WHERE challenge = $1
            AND expires_at > NOW()
          RETURNING challenge
        `,
        [Buffer.from(clientDataJSON.challenge, "base64url")],
      );

      if (!challengeRow) {
        throw new Error("AUTHENTICATION_FAILED");
      }

      client = await db.connect();
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
      const oldCounter = Number(credential.sign_count);

      if (newCounter > 0 && newCounter <= oldCounter) {
        throw new Error("AUTHENTICATION_FAILED");
      }

      await client.query(
        `
          UPDATE passkey_credentials
          SET sign_count =
            CASE
              WHEN $2 > sign_count THEN $2
              ELSE sign_count
            END
          WHERE credential_id = $1
        `,
        [credential.credential_id, newCounter],
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
        [credential.user_id, hash],
      );

      await client.query("COMMIT");

      console.log(
        JSON.stringify({
          event: "session_created",
          level: "info",
          session_id: session.id,
          user_id: credential.user_id,
        }),
      );

      return {
        refresh_token: token,
      };
    } catch (err) {
      await client?.query("ROLLBACK").catch(() => {});

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

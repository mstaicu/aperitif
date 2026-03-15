import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import {
  AuthenticationFinalizeBody,
  AuthSuccessResponse,
  ErrorResponse,
  hostname,
  origin,
} from "./shared.mjs";

/**
 * @type {import('fastify').RouteOptions}
 */
export default {
  handler: async function (request, reply) {
    const { pool } = this;

    const { authentication } = request.body;

    if (authentication.id !== authentication.rawId) {
      return reply.code(400).send(null);
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
      return reply.code(400).send(null);
    }

    if (
      !clientDataJSON ||
      typeof clientDataJSON !== "object" ||
      typeof clientDataJSON.challenge !== "string"
    ) {
      return reply.code(400).send(null);
    }

    let challengeBytes;

    try {
      challengeBytes = Buffer.from(clientDataJSON.challenge, "base64url");
    } catch {
      return reply.code(400).send(null);
    }

    const {
      rows: [challengeRow],
    } = await pool.query(
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
      return reply.code(401).send(null);
    }

    const client = await pool.connect();

    try {
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
        await client.query("ROLLBACK");
        return reply.code(401).send(null);
      }

      if (authentication.response.userHandle) {
        const userHandle = Buffer.from(
          authentication.response.userHandle,
          "base64url",
        );

        if (!userHandle.equals(credential.user_id)) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
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
          response: {
            ...authentication,
            clientExtensionResults: authentication.clientExtensionResults ?? {},
          },
        });
      } catch {
        await client.query("ROLLBACK");
        return reply.code(401).send(null);
      }

      if (!verification.verified) {
        await client.query("ROLLBACK");
        return reply.code(401).send(null);
      }

      const newCounter = verification.authenticationInfo.newCounter;
      const oldCounter = Number(credential.sign_count);

      if (newCounter > 0 && newCounter <= oldCounter) {
        await client.query("ROLLBACK");
        return reply.code(401).send(null);
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

      await client.query("COMMIT");

      // const { hash, token: refreshToken } = generateRefreshToken();

      // await client.query(
      //   `
      //     INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
      //     VALUES ($1, $2, NOW() + INTERVAL '30 days')
      //   `,
      //   [userId, hash],
      // );

      // await client.query("COMMIT");

      // reply.header("Cache-Control", "no-store");
      // reply.header("Pragma", "no-cache");

      // return reply.code(200).send({
      //   access_token,
      //   refresh_token: refreshToken,
      // });

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({
        refresh_token: "TODO",
      });
    } catch {
      await client.query("ROLLBACK");

      return reply.code(500).send(null);
    } finally {
      client.release();
    }
  },

  method: "POST",

  schema: {
    body: AuthenticationFinalizeBody,
    response: {
      200: AuthSuccessResponse,
      400: ErrorResponse,
      401: ErrorResponse,
      500: ErrorResponse,
    },
    tags: ["v1"],
  },

  url: "/passkeys/login",
};

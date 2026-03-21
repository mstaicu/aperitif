import { verifyRegistrationResponse } from "@simplewebauthn/server";
import nconf from "nconf";

import {
  ErrorResponse,
  RegistrationBody,
  RegistrationSuccessResponse,
} from "../../schemas.mjs";
import { generateRefreshToken } from "./shared.mjs";

const { hostname, origin } = new URL(nconf.get("ORIGIN"));

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/register",
    {
      schema: {
        body: RegistrationBody,
        description:
          "Verifies the WebAuthn registration response and stores the credential.",
        operationId: "registerPasskey",
        response: {
          201: RegistrationSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Finalize passkey registration",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { pool } = this;

      const { credential } = request.body;

      if (credential.id !== credential.rawId) {
        return reply.code(400).send(null);
      }

      let clientDataJSON;

      try {
        clientDataJSON = JSON.parse(
          Buffer.from(credential.response.clientDataJSON, "base64url").toString(
            "utf8",
          ),
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
            AND user_id IS NOT NULL
            AND expires_at > NOW()
          RETURNING user_id, challenge
        `,
        [challengeBytes],
      );

      if (!challengeRow?.user_id || !challengeRow?.challenge) {
        return reply.code(401).send(null);
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
        return reply.code(401).send(null);
      }

      if (
        !verification?.verified ||
        !verification.registrationInfo?.credential
      ) {
        return reply.code(401).send(null);
      }

      const registrationCredential = verification.registrationInfo.credential;

      if (
        typeof registrationCredential.id !== "string" ||
        !registrationCredential.publicKey
      ) {
        return reply.code(400).send(null);
      }

      if (credential.id !== registrationCredential.id) {
        return reply.code(400).send(null);
      }

      const credentialId = Buffer.from(registrationCredential.id, "base64url");
      const publicKey = Buffer.from(registrationCredential.publicKey);
      const signCount = registrationCredential.counter;

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        /** @type {String} */
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

        await client.query("COMMIT");

        const { hash, token: refreshToken } = generateRefreshToken();

        await client.query(
          `
            INSERT INTO sessions (user_id, refresh_token_hash, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '30 days')
          `,
          [userId, hash],
        );

        await client.query("COMMIT");

        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(201).send({
          refresh_token: refreshToken,
        });
      } catch (err) {
        await client.query("ROLLBACK");

        /** @type {any} */
        const error = err;

        if (error?.code === "23505") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );
}

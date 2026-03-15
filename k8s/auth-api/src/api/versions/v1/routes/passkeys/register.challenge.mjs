import { trace } from "@opentelemetry/api";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

import { hostname, RegistrationChallengeResponse } from "./shared.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function registerChallenge(fastify) {
  fastify.post(
    "/register/challenge",
    {
      schema: {
        response: {
          200: RegistrationChallengeResponse,
        },
        tags: ["passkeys"],
      },
    },
    async function registerChallengeHandler(_, reply) {
      const { pool } = this;

      trace.getActiveSpan()?.updateName("auth.registration.challenge");

      const userID = randomBytes(32);
      const challenge = randomBytes(32);

      const options = await generateRegistrationOptions({
        attestationType: "none",
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
        challenge,
        rpID: hostname,
        rpName: hostname,
        timeout: 60000,
        userID,
        userName: userID.toString("base64url"),
      });

      await pool.query(
        `
        INSERT INTO challenges (user_id, challenge)
        VALUES ($1, $2)
      `,
        [userID, challenge],
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({ publicKey: options });
    },
  );
}

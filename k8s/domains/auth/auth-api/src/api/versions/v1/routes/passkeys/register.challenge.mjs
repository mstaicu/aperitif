// import { trace } from "@opentelemetry/api";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import nconf from "nconf";
import { randomBytes, randomUUID } from "node:crypto";

import { RegistrationChallengeResponse } from "../../schemas.mjs";

const { hostname } = new URL(nconf.get("ORIGIN"));

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/register/challenge",
    {
      schema: {
        description:
          "Generates a WebAuthn credential creation challenge used to register a new passkey.",
        operationId: "createPasskeyRegistrationChallenge",
        response: {
          200: RegistrationChallengeResponse,
        },
        summary: "Create passkey registration challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      const { pool } = this;

      // trace.getActiveSpan()?.updateName("auth.registration.challenge");

      const userId = randomUUID();
      const webauthnUserHandle = Buffer.from(userId.replace(/-/g, ""), "hex");
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
        userID: webauthnUserHandle,
        userName: "",
      });

      await pool.query(
        `
          INSERT INTO challenges (user_id, challenge)
          VALUES ($1, $2)
        `,
        [userId, challenge],
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send({ publicKey: options });
    },
  );
}

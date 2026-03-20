import { generateAuthenticationOptions } from "@simplewebauthn/server";
import nconf from "nconf";
import { randomBytes } from "node:crypto";

import { AuthenticationChallengeResponse } from "../../schemas.mjs";

const { hostname } = new URL(nconf.get("ORIGIN"));

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/login/challenge",
    {
      schema: {
        description:
          "Generates a WebAuthn authentication challenge for passkey login",
        operationId: "createPasskeyLoginChallenge",
        response: {
          200: AuthenticationChallengeResponse,
        },
        summary: "Create authentication challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      const { pool } = this;

      const challenge = randomBytes(32);

      const options = await generateAuthenticationOptions({
        challenge,
        rpID: hostname,
        userVerification: "required",
      });

      await pool.query(
        `
          INSERT INTO challenges (user_id, challenge)
          VALUES (NULL, $1)
        `,
        [challenge],
      );

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send({ publicKey: options });
    },
  );
}

import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

import { AuthenticationChallengeResponse, hostname } from "./shared.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/login/challenge",
    {
      schema: {
        response: {
          200: AuthenticationChallengeResponse,
        },
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

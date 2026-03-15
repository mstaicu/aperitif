import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

import { AuthenticationChallengeResponse, hostname } from "./shared.mjs";

/**
 * @type {import('fastify').RouteOptions}
 */
export default {
  handler: async function (_, reply) {
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

  method: "POST",

  schema: {
    response: {
      200: AuthenticationChallengeResponse,
    },
    tags: ["v1"],
  },

  url: "/passkeys/login/challenge",
};

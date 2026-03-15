import { trace } from "@opentelemetry/api";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "node:crypto";

import { hostname, RegistrationChallengeResponse } from "./shared.mjs";

/**
 * @type {import('fastify').RouteOptions}
 */
export default {
  handler: async function (_, reply) {
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

  method: "POST",

  schema: {
    response: {
      200: RegistrationChallengeResponse,
    },
    tags: ["v1"],
  },

  url: "/passkeys/register/challenge",
};

import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { RegistrationChallengeResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../domains/passkeys/index.mjs").PasskeysDomain} PasskeysDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysDomain}} opts
 */
export default async function (fastify, { passkeys }) {
  fastify.post(
    "/register/challenge",
    {
      schema: {
        description:
          "Generates and persists a one-time WebAuthn credential creation challenge used to register a new passkey and bootstrap a new identity.",
        operationId: "createPasskeyRegistrationChallenge",
        response: {
          200: RegistrationChallengeResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey registration challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply
        .code(200)
        .send({ publicKey: await passkeys.createRegisterChallenge() });
    },
  );
}

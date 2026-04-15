import { RegistrationChallengeResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/index.mjs").Runtime} Runtime
 */

/**
 * @param {Fastify} fastify
 * @param {{runtime: Runtime}} opts
 */
export default async function (fastify, { runtime }) {
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
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      const publicKey = await runtime.passkeys.createRegisterChallenge();

      return reply.code(200).send({ publicKey });
    },
  );
}

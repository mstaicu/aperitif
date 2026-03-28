import { RegistrationChallengeResponse } from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

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

      return reply
        .code(200)
        .send({ publicKey: await runtime.passkeys.createRegisterChallenge() });
    },
  );
}

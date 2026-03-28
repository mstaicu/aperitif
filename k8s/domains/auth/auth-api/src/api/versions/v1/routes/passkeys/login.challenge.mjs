import { AuthenticationChallengeResponse } from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

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
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send({
        publicKey: await runtime.passkeys.createLoginChallenge(),
      });
    },
  );
}

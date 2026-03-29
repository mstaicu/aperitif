import { AuthenticationChallengeResponse } from "../../schemas.mjs";

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

      const publicKey = await runtime.passkeys.createLoginChallenge();

      return reply.send({
        publicKey,
      });
    },
  );
}

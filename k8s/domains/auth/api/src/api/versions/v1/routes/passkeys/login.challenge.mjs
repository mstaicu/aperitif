import { AuthenticationChallengeResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/passkeys/index.mjs").PasskeysRuntime} PasskeysRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysRuntime}} opts
 */
export default async function (fastify, { passkeys }) {
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

      const publicKey = await passkeys.createLoginChallenge();

      return reply.send({
        publicKey,
      });
    },
  );
}

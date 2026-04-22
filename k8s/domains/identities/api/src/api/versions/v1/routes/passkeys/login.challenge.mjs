import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AuthenticationChallengeResponse } from "./schemas.mjs";

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
    "/login/challenge",
    {
      schema: {
        description:
          "Generates and persists a one-time WebAuthn authentication challenge for passkey login.",
        operationId: "createPasskeyLoginChallenge",
        response: {
          200: AuthenticationChallengeResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey login challenge",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send({
        publicKey: await passkeys.createLoginChallenge(),
      });
    },
  );
}

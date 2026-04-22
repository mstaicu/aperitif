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
      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.send({
          publicKey: await passkeys.createLoginChallenge(),
        });
      } catch (err) {
        if (/** @type {Error} */ (err).message === "DATABASE_UNAVAILABLE") {
          return reply.type("application/problem+json").code(503).send({
            status: 503,
            title: "Database unavailable",
            type: "/problems/database-unavailable",
          });
        }

        return reply.type("application/problem+json").code(500).send({
          status: 500,
          title: "Internal server error",
          type: "/problems/internal-server-error",
        });
      }
    },
  );
}

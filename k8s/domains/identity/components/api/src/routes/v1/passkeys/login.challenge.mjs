import { ProblemResponse } from "../../problem-details.mjs";
import { AuthenticationChallengeResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerLoginChallengeRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/login/challenge",
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

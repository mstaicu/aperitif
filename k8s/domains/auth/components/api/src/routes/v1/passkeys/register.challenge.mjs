import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { RegistrationChallengeResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerRegistrationChallengeRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/register/challenge",
    {
      schema: {
        description:
          "Generates and persists a one-time WebAuthn credential creation challenge used to register a new user.",
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

      return reply.code(200).send({
        publicKey: await passkeys.createRegisterChallenge(),
      });
    },
  );
}

import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { RegistrationOptionsResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerRegistrationOptionsRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/registration/options",
    {
      schema: {
        description:
          "Creates the WebAuthn options required to register a new user and passkey.",
        operationId: "createPasskeyRegistrationOptions",
        response: {
          200: RegistrationOptionsResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey registration options",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send(await passkeys.createRegistrationOptions());
    },
  );
}

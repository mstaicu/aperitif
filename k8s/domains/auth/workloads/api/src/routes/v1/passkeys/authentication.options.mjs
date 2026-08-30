import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AuthenticationOptionsResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerAuthenticationOptionsRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/authentication/options",
    {
      schema: {
        description:
          "Creates the WebAuthn options required to authenticate with a passkey.",
        operationId: "createPasskeyAuthenticationOptions",
        response: {
          200: AuthenticationOptionsResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey authentication options",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send(await passkeys.createAuthenticationOptions());
    },
  );
}

import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AuthenticationBody, SessionResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerAuthenticationRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/authentication",
    {
      schema: {
        body: AuthenticationBody,
        description:
          "Verifies a WebAuthn authentication response and creates an independent session.",
        operationId: "authenticateWithPasskey",
        response: {
          200: SessionResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Authenticate with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send(await passkeys.authenticate(request.body));
    },
  );
}

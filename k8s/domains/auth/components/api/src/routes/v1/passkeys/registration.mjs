import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { RegistrationBody, SessionResponse } from "./passkey.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 * }} opts
 */
export function registerRegistrationRoute(fastify, { passkeys }) {
  fastify.post(
    "/v1/passkeys/registration",
    {
      schema: {
        body: RegistrationBody,
        description:
          "Verifies a WebAuthn registration response, creates the user and passkey, and creates the first session.",
        operationId: "registerWithPasskey",
        response: {
          201: SessionResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Register with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(201).send(await passkeys.register(request.body));
    },
  );
}

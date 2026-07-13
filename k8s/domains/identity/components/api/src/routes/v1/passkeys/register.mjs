import { ProblemResponse } from "../../problem-details.mjs";
import {
  PasskeyRegistrationBody,
  RegistrationSuccessResponse,
} from "./passkey.schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../../services/passkeys/index.mjs").PasskeysService,
 *   prefix: string,
 * }} opts
 */
export function registerRegistrationRoute(fastify, { passkeys, prefix }) {
  fastify.post(
    `${prefix}/register`,
    {
      schema: {
        body: PasskeyRegistrationBody,
        description:
          "Verifies the WebAuthn registration response, stores the first passkey, and issues the first refresh token.",
        operationId: "registerPasskey",
        response: {
          201: RegistrationSuccessResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Finalize passkey registration",
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

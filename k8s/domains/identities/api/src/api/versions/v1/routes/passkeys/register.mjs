import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { RegistrationBody, RegistrationSuccessResponse } from "./schemas.mjs";

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
    "/register",
    {
      schema: {
        body: RegistrationBody,
        description:
          "Verifies the WebAuthn registration response, creates the identity if needed, stores the credential, and issues the first refresh token.",
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
      const input = {
        credential: request.body.credential,
      };

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(201).send(await passkeys.register(input));
    },
  );
}

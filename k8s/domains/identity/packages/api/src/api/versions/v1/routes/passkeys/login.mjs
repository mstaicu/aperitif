import { ProblemResponse } from "../../../../problem-details.mjs";
import { LoginBody, LoginSuccessResponse } from "./passkey.schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../services/passkeys/index.mjs").PasskeysService} PasskeysService
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysService}} opts
 */
export default async function (fastify, { passkeys }) {
  fastify.post(
    "/login",
    {
      schema: {
        body: LoginBody,
        description:
          "Verifies the WebAuthn authentication response for an existing identity and issues a refresh token if successful.",
        operationId: "loginWithPasskey",
        response: {
          200: LoginSuccessResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Finalize passkey login",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.code(200).send(await passkeys.login(request.body));
    },
  );
}

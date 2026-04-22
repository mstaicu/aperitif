import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { LoginBody, LoginSuccessResponse } from "./schemas.mjs";

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
    "/login",
    {
      schema: {
        body: LoginBody,
        description:
          "Verifies the WebAuthn authentication response and issues a refresh token if successful.",
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
      const input = {
        authentication: request.body.authentication,
      };

      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send(await passkeys.login(input));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE"
        ) {
          return reply.type("application/problem+json").code(400).send({
            status: 400,
            title: "Invalid authentication response",
            type: "/problems/invalid-authentication-response",
          });
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "CREDENTIAL_NOT_FOUND" ||
          code === "INVALID_USER_HANDLE" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED" ||
          code === "COUNTER_REPLAY"
        ) {
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Authentication failed",
            type: "/problems/authentication-failed",
          });
        }

        if (code === "DATABASE_UNAVAILABLE") {
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

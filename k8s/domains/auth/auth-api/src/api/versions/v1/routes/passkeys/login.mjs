import {
  ErrorResponse,
  LoginBody,
  LoginSuccessResponse,
} from "../../schemas.mjs";

/**
 * @typedef {import("../../../../../server.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/index.mjs").Runtime} Runtime
 */

/**
 * @param {Fastify} fastify
 * @param {{runtime: Runtime}} opts
 */
export default async function (fastify, { runtime }) {
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
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Finalize passkey login",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(200).send(await runtime.passkeys.login(request.body));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE"
        ) {
          return reply.code(400).send(null);
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "CREDENTIAL_NOT_FOUND" ||
          code === "INVALID_USER_HANDLE" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED" ||
          code === "COUNTER_REPLAY"
        ) {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

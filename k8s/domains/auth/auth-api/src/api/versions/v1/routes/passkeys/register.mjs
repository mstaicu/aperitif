import {
  ErrorResponse,
  RegistrationBody,
  RegistrationSuccessResponse,
} from "../../schemas.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/register",
    {
      schema: {
        body: RegistrationBody,
        description:
          "Verifies the WebAuthn registration response and stores the credential.",
        operationId: "registerPasskey",
        response: {
          201: RegistrationSuccessResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Finalize passkey registration",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply
          .code(201)
          .send(await runtime.passkeys.register(request.body));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE" ||
          code === "INVALID_REGISTRATION_CREDENTIAL" ||
          code === "CREDENTIAL_ID_MISMATCH"
        ) {
          return reply.code(400).send(null);
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED"
        ) {
          return reply.code(401).send(null);
        }

        if (code === "CREDENTIAL_ALREADY_EXISTS") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

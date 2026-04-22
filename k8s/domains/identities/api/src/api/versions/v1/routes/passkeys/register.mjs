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

      try {
        reply.header("Cache-Control", "no-store");
        reply.header("Pragma", "no-cache");

        return reply.code(201).send(await passkeys.register(input));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (
          code === "INVALID_CREDENTIAL" ||
          code === "INVALID_CLIENT_DATA" ||
          code === "INVALID_CHALLENGE" ||
          code === "INVALID_REGISTRATION_CREDENTIAL" ||
          code === "CREDENTIAL_ID_MISMATCH"
        ) {
          return reply.type("application/problem+json").code(400).send({
            status: 400,
            title: "Invalid registration response",
            type: "/problems/invalid-registration-response",
          });
        }

        if (
          code === "CHALLENGE_NOT_FOUND" ||
          code === "VERIFICATION_FAILED" ||
          code === "NOT_VERIFIED"
        ) {
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Registration verification failed",
            type: "/problems/registration-verification-failed",
          });
        }

        if (code === "CREDENTIAL_ALREADY_EXISTS") {
          return reply.type("application/problem+json").code(409).send({
            status: 409,
            title: "Passkey already exists",
            type: "/problems/credential-already-exists",
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

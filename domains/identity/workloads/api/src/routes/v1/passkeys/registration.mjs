import { createPasskeyRegistrationOptions } from "../../../services/passkeys/registration-options.mjs";
import { completePasskeyRegistration } from "../../../services/passkeys/registration.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { SessionResponse } from "../sessions/schemas.mjs";
import { PasskeyRegistrationBody } from "./schemas.mjs";
import { RegistrationOptionsResponse } from "./webauthn.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function registrationRoutes(fastify, { origin, pool }) {
  fastify.post(
    "/passkeys/registration",
    {
      schema: {
        body: PasskeyRegistrationBody,
        description:
          "Creates a principal, first passkey, and session using single-use registration options. Verification failures return 422; start again with fresh registration options and proof. Each new attempt creates a new principal identity. Does not add passkeys to an existing principal.",
        operationId: "completePasskeyRegistration",
        response: {
          "4xx": ErrorResponse,
          201: SessionResponse,
          400: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [],
        summary: "Complete passkey registration",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const session = await completePasskeyRegistration(
        { origin, pool },
        request.body,
      );

      return reply.code(201).send(session);
    },
  );

  fastify.post(
    "/passkeys/registration/options",
    {
      schema: {
        description:
          "Creates single-use registration options for a new principal. These options cannot be used to add a passkey to an existing principal.",
        operationId: "createPasskeyRegistrationOptions",
        response: {
          "4xx": ErrorResponse,
          200: RegistrationOptionsResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [],
        summary: "Create passkey registration options",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      return reply
        .code(200)
        .send(await createPasskeyRegistrationOptions({ origin, pool }));
    },
  );
}

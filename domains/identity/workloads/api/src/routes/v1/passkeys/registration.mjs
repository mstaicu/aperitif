import { createRegistrationOptions } from "../../../services/passkeys/registration-options.mjs";
import { registerWithPasskey } from "../../../services/passkeys/registration.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { SessionResponse } from "../sessions/schemas.mjs";
import { RegisterPasskeyBody } from "./schemas.mjs";
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
        body: RegisterPasskeyBody,
        description:
          "Creates a principal, first passkey, and session using a single-use signup registration challenge. Does not add credentials to an existing principal.",
        operationId: "registerWithPasskey",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it and obtain fresh options and proof before resubmitting.",
          },
          201: SessionResponse,
          400: {
            ...ErrorResponse,
            description:
              "The registration request or response is malformed. Correct it and obtain fresh registration options before resubmitting.",
          },
          422: {
            ...ErrorResponse,
            description:
              "The registration could not be completed; failure causes are intentionally indistinguishable. Obtain fresh registration options for the same principal before resubmitting. Signup may require signing in with an existing passkey instead.",
          },
          500: {
            ...ErrorResponse,
            description:
              "The request failed; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
        },
        security: [],
        summary: "Sign up with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const { credential, name } = request.body;
      const session = await registerWithPasskey(
        { origin, pool },
        { credential, name },
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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: RegistrationOptionsResponse,
          500: {
            ...ErrorResponse,
            description:
              "Registration options could not be returned. Try again later to obtain fresh options before starting a ceremony.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Try again later to obtain fresh registration options.",
          },
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
        .send(await createRegistrationOptions({ origin, pool }));
    },
  );
}

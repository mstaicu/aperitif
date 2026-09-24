import { ProblemResponse } from "../../platform/problem-details.mjs";
import { createAuthenticationOptions } from "../../services/passkeys/authentication-options.mjs";
import { authenticate } from "../../services/passkeys/authentication.mjs";
import { createRegistrationOptions } from "../../services/passkeys/registration-options.mjs";
import { register } from "../../services/passkeys/registration.mjs";
import {
  AuthenticationBody,
  AuthenticationOptionsResponse,
  RegistrationBody,
  RegistrationOptionsResponse,
  SessionResponse,
} from "./passkeys.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function passkeysRoutes(fastify, { origin, pool }) {
  fastify.post(
    "/passkeys/authentication",
    {
      schema: {
        body: AuthenticationBody,
        description:
          "Verifies a WebAuthn authentication response and creates an independent session.",
        operationId: "authenticateWithPasskey",
        response: {
          200: SessionResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Authenticate with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply
        .code(200)
        .send(await authenticate({ origin, pool }, request.body));
    },
  );

  fastify.post(
    "/passkeys/authentication/options",
    {
      schema: {
        description:
          "Creates the WebAuthn options required to authenticate with a passkey.",
        operationId: "createPasskeyAuthenticationOptions",
        response: {
          200: AuthenticationOptionsResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey authentication options",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send(await createAuthenticationOptions({ origin, pool }));
    },
  );

  fastify.post(
    "/passkeys/registration",
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

      return reply
        .code(201)
        .send(await register({ origin, pool }, request.body));
    },
  );

  fastify.post(
    "/passkeys/registration/options",
    {
      schema: {
        description:
          "Creates the WebAuthn options required to register a new user and passkey.",
        operationId: "createPasskeyRegistrationOptions",
        response: {
          200: RegistrationOptionsResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create passkey registration options",
        tags: ["passkeys"],
      },
    },
    async function (_, reply) {
      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply
        .code(200)
        .send(await createRegistrationOptions({ origin, pool }));
    },
  );
}

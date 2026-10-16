import { Type } from "@fastify/type-provider-typebox";

import { createAuthenticationOptions } from "../../services/passkeys/authentication-options.mjs";
import { authenticate } from "../../services/passkeys/authentication.mjs";
import { createRegistrationOptions } from "../../services/passkeys/registration-options.mjs";
import { register } from "../../services/passkeys/registration.mjs";
import { authenticateAccessToken } from "../../services/sessions/authenticate.mjs";
import { createSession } from "../../services/sessions/create.mjs";
import { ProblemResponse } from "../problem-details.mjs";
import {
  AuthenticationOptionsResponse,
  RegisterPasskeyBody,
  RegistrationOptionsResponse,
} from "./passkeys.schemas.mjs";
import { SessionResponse } from "./sessions.schemas.mjs";
import { AuthenticationResponseJSON } from "./webauthn.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   jwks: import("jose").JWTVerifyGetKey,
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function passkeysRoutes(fastify, { jwks, origin, pool }) {
  fastify.post(
    "/passkeys/authentication",
    {
      schema: {
        body: AuthenticationResponseJSON,
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

      const principalId = await authenticate({ origin, pool }, request.body);
      const session = await createSession({ client: pool, principalId });

      return reply.code(200).send({
        expires_in: session.expiresIn,
        session_token: session.sessionToken,
      });
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

      return reply.send(await createAuthenticationOptions({ origin, pool }));
    },
  );

  fastify.post(
    "/passkeys/registration",
    {
      schema: {
        body: RegisterPasskeyBody,
        description:
          "Without Authorization, creates a principal, passkey, and session and returns 201 with the session. With a valid access token, requires authentication from an existing passkey belonging to the same principal and returns 204 without creating a session. Retrieve passkey metadata with GET /passkeys. Authentication challenges are single-use; failed changes require a fresh proof.",
        operationId: "registerWithPasskey",
        response: {
          201: SessionResponse,
          204: Type.Null({ description: "Passkey added." }),
          400: ProblemResponse,
          401: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{}, { bearerAuth: [] }],
        summary: "Sign up or add a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const principalId =
        request.headers.authorization !== undefined
          ? await authenticateAccessToken({
              authorization: request.headers.authorization,
              jwks,
              pool,
            })
          : undefined;

      if (principalId) {
        if (!request.body.authentication)
          throw new Error("AUTHENTICATION_FAILED");

        const authenticatedPrincipalId = await authenticate(
          { origin, pool },
          request.body.authentication,
        );

        if (authenticatedPrincipalId !== principalId) {
          throw new Error("AUTHENTICATION_FAILED");
        }
      } else if (request.body.authentication) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const session = await register(
        { origin, pool },
        {
          credential: request.body.credential,
          name: request.body.name,
          principalId,
        },
      );

      if (session === null) return reply.code(204).send(null);

      return reply.code(201).send(session);
    },
  );

  fastify.post(
    "/passkeys/registration/options",
    {
      schema: {
        description:
          "Creates signup options without Authorization, or options for adding a passkey to the principal identified by a valid access token. Invalid supplied authorization is rejected.",
        operationId: "createPasskeyRegistrationOptions",
        response: {
          200: RegistrationOptionsResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{}, { bearerAuth: [] }],
        summary: "Create passkey registration options",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const principalId =
        request.headers.authorization !== undefined
          ? await authenticateAccessToken({
              authorization: request.headers.authorization,
              jwks,
              pool,
            })
          : undefined;

      return reply
        .code(200)
        .send(await createRegistrationOptions({ origin, pool }, principalId));
    },
  );
}

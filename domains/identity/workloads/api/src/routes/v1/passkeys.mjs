import { Type } from "@fastify/type-provider-typebox";
import createError from "http-errors";

import { createAuthenticationOptions } from "../../services/passkeys/authentication-options.mjs";
import {
  authenticate,
  getAuthenticationChallenge,
} from "../../services/passkeys/authentication.mjs";
import { createRegistrationOptions } from "../../services/passkeys/registration-options.mjs";
import {
  getRegistrationChallenge,
  register,
} from "../../services/passkeys/registration.mjs";
import { authenticateAccessToken } from "../../services/sessions/authenticate.mjs";
import { createSession } from "../../services/sessions/create.mjs";
import { ErrorResponse } from "../errors.mjs";
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
          "4xx": ErrorResponse,
          200: SessionResponse,
          400: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        summary: "Authenticate with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const client = await pool.connect();

      try {
        const challenge = await getAuthenticationChallenge(
          { client },
          request.body,
        );

        await client.query("BEGIN");

        const principalId = await authenticate(
          { client, origin },
          request.body,
          challenge,
        );
        const session = await createSession({ client, principalId });

        await client.query("COMMIT");

        return reply.code(200).send(session);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
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
          "4xx": ErrorResponse,
          200: AuthenticationOptionsResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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
          "4xx": ErrorResponse,
          201: SessionResponse,
          204: Type.Null({ description: "Passkey added." }),
          400: ErrorResponse,
          401: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{}, { bearerAuth: [] }],
        summary: "Sign up or add a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      if (request.headers.authorization !== undefined) {
        if (!request.body.authentication) {
          throw new createError.UnprocessableEntity();
        }
      } else if (request.body.authentication) {
        throw new createError.Unauthorized();
      }

      const client = await pool.connect();

      try {
        const authenticationChallenge = request.body.authentication
          ? await getAuthenticationChallenge(
              { client },
              request.body.authentication,
            )
          : undefined;

        const registrationChallenge = await getRegistrationChallenge(
          { client },
          request.body.credential,
        );

        await client.query("BEGIN");

        let principalId;

        if (
          request.body.authentication &&
          authenticationChallenge !== undefined
        ) {
          const authenticatedPrincipalId = await authenticate(
            { client, origin },
            request.body.authentication,
            authenticationChallenge,
          );

          principalId = await authenticateAccessToken({
            authorization: request.headers.authorization,
            jwks,
            pool: client,
          });

          if (authenticatedPrincipalId !== principalId) {
            throw new createError.UnprocessableEntity();
          }
        }

        const session = await register(
          { client, origin },
          {
            challenge: registrationChallenge,
            credential: request.body.credential,
            name: request.body.name,
            principalId,
          },
        );

        await client.query("COMMIT");

        if (session === null) return reply.code(204).send(null);

        return reply.code(201).send(session);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
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
          "4xx": ErrorResponse,
          200: RegistrationOptionsResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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

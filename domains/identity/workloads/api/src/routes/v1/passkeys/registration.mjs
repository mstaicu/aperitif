import { Type } from "@fastify/type-provider-typebox";

import { addPasskey } from "../../../services/passkeys/add.mjs";
import { createRegistrationOptions } from "../../../services/passkeys/registration-options.mjs";
import { signUpWithPasskey } from "../../../services/passkeys/sign-up.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { SessionResponse } from "../sessions/schemas.mjs";
import { RegisterPasskeyBody } from "./schemas.mjs";
import { RegistrationOptionsResponse } from "./webauthn.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   jwks: import("jose").JWTVerifyGetKey,
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function registrationRoutes(
  fastify,
  { jwks, origin, pool },
) {
  fastify.post(
    "/passkeys/registration",
    {
      schema: {
        body: RegisterPasskeyBody,
        description:
          "Without Authorization, creates a principal, passkey, and session and returns 201 with the session. With a valid access token, adds the new passkey to that principal and returns 204 without creating a session. Only the new passkey's registration response is required. Registration challenges are single-use; failed changes require fresh registration options.",
        operationId: "registerWithPasskey",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it and obtain fresh options and proof before resubmitting.",
          },
          201: SessionResponse,
          204: Type.Null({ description: "Passkey added." }),
          400: {
            ...ErrorResponse,
            description:
              "The registration request or response is malformed. Correct it and obtain fresh registration options before resubmitting.",
          },
          401: {
            ...ErrorResponse,
            description:
              "The supplied access token is invalid or expired. Call createAccessToken using a valid session; otherwise sign in. Obtain fresh registration options before resubmitting.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
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
        security: [{}, { bearerAuth: [] }],
        summary: "Sign up or add a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const { credential, name } = request.body;
      const authorization = request.headers.authorization;

      if (authorization !== undefined) {
        await addPasskey(
          { jwks, origin, pool },
          { authorization, credential, name },
        );

        return reply.code(204).send(null);
      }

      const session = await signUpWithPasskey(
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
          "Creates signup options without Authorization, or options for adding a passkey to the principal identified by a valid access token. Invalid supplied authorization is rejected.",
        operationId: "createPasskeyRegistrationOptions",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: RegistrationOptionsResponse,
          401: {
            ...ErrorResponse,
            description:
              "The supplied access token is invalid or expired. Call createAccessToken using a valid session; otherwise sign in before requesting options to add a passkey.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
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

import { createAuthenticationOptions } from "../../../services/passkeys/authentication-options.mjs";
import { signInWithPasskey } from "../../../services/passkeys/authentication.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { SessionResponse } from "../sessions/schemas.mjs";
import {
  AuthenticationOptionsResponse,
  AuthenticationResponseJSON,
} from "./webauthn.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function authenticationRoutes(fastify, { origin, pool }) {
  fastify.post(
    "/passkeys/authentication",
    {
      schema: {
        body: AuthenticationResponseJSON,
        description:
          "Verifies a WebAuthn authentication response and creates an independent session.",
        operationId: "authenticateWithPasskey",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it and obtain fresh options and proof before resubmitting.",
          },
          200: SessionResponse,
          400: {
            ...ErrorResponse,
            description:
              "The authentication response is malformed. Correct it and obtain fresh authentication options and proof before resubmitting.",
          },
          422: {
            ...ErrorResponse,
            description:
              "Authentication proof was rejected; failure causes are intentionally indistinguishable. Call createPasskeyAuthenticationOptions and obtain a new WebAuthn proof. Do not replay the submitted proof.",
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
        summary: "Authenticate with a passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const session = await signInWithPasskey({ origin, pool }, request.body);

      return reply.code(200).send(session);
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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: AuthenticationOptionsResponse,
          500: {
            ...ErrorResponse,
            description:
              "Authentication options could not be returned. Try again later to obtain fresh options before starting a ceremony.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Try again later to obtain fresh authentication options.",
          },
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
}

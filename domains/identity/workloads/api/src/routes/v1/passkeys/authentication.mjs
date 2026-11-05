import { createPasskeyAuthenticationOptions } from "../../../services/passkeys/authentication-options.mjs";
import { completePasskeyAuthentication } from "../../../services/passkeys/authentication.mjs";
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
          "Verifies a single-use WebAuthn authentication response and creates an independent session. Rejected proofs return 422; obtain fresh authentication options and proof.",
        operationId: "completePasskeyAuthentication",
        response: {
          "4xx": ErrorResponse,
          200: SessionResponse,
          400: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        summary: "Complete passkey authentication",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const session = await completePasskeyAuthentication(
        { origin, pool },
        request.body,
      );

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

      return reply.send(
        await createPasskeyAuthenticationOptions({ origin, pool }),
      );
    },
  );
}

import { Type } from "@fastify/type-provider-typebox";

import { createAdditionOptions } from "../../../services/passkeys/add-options.mjs";
import { addPasskey } from "../../../services/passkeys/add.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { AdditionOptionsResponse, AddPasskeyBody } from "./schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   jwks: import("jose").JWTVerifyGetKey,
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function additionRoutes(fastify, { jwks, origin, pool }) {
  fastify.post(
    "/passkeys/add/options",
    {
      schema: {
        description:
          "Returns paired existing-key authentication and new-key registration options, bound to the current session for two minutes. Perform both ceremonies and submit both responses to addPasskey. A login proof cannot replace this authentication proof.",
        operationId: "createPasskeyAdditionOptions",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before requesting fresh options.",
          },
          200: AdditionOptionsResponse,
          401: {
            ...ErrorResponse,
            description:
              "A live access token is required. Obtain one using a valid session or sign in.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          500: {
            ...ErrorResponse,
            description:
              "Options could not be returned. Request fresh options later.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Request fresh options later.",
          },
        },
        security: [{ bearerAuth: [] }],
        summary: "Start passkey addition",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      const session = await authenticateAccessToken(
        { jwks, pool },
        { authorization: request.headers.authorization },
      );

      return reply.send(
        await createAdditionOptions({ origin, pool }, { session }),
      );
    },
  );

  fastify.post(
    "/passkeys/add",
    {
      schema: {
        body: AddPasskeyBody,
        description:
          "Verifies both responses from one createPasskeyAdditionOptions attempt using the same live session, then stores the new passkey. Creates no session. The paired challenges are single-use; failed verification requires a new pair and both ceremonies.",
        operationId: "addPasskey",
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Obtain fresh addition options and both proofs before retrying.",
          },
          204: Type.Null({ description: "Passkey added." }),
          400: {
            ...ErrorResponse,
            description:
              "The request is malformed. Correct it and obtain fresh addition options and both proofs.",
          },
          401: {
            ...ErrorResponse,
            description:
              "The access token or session is invalid or expired. Sign in or obtain a valid access token, then request fresh addition options.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          422: {
            ...ErrorResponse,
            description:
              "The proofs, attempt, principal or session did not match, or verification failed. Failure causes are intentionally indistinguishable. Request fresh addition options and both proofs.",
          },
          500: {
            ...ErrorResponse,
            description:
              "The operation outcome may be unknown. Check the passkey list before starting another attempt; do not automatically retry the mutation.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable and the outcome may be unknown. Check the passkey list before starting another attempt.",
          },
        },
        security: [{ bearerAuth: [] }],
        summary: "Add a passkey",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      await addPasskey(
        { jwks, origin, pool },
        { ...request.body, authorization: request.headers.authorization },
      );

      return reply.code(204).send(null);
    },
  );
}

import { Type } from "@fastify/type-provider-typebox";

import { createPasskeyAdditionOptions } from "../../../services/passkeys/addition-options.mjs";
import { completePasskeyAddition } from "../../../services/passkeys/addition.mjs";
import { ErrorResponse } from "../../errors.mjs";
import {
  PasskeyAdditionBody,
  PasskeyAdditionOptionsResponse,
} from "./schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   jwks: import("jose").JWTVerifyGetKey,
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function additionRoutes(fastify, { jwks, origin, pool }) {
  fastify.post(
    "/passkeys/addition/options",
    {
      schema: {
        description:
          "Returns paired existing-key authentication and new-key registration options, bound to the current session for two minutes. Perform both ceremonies and submit both responses to completePasskeyAddition. A login proof cannot replace this authentication proof.",
        operationId: "createPasskeyAdditionOptions",
        response: {
          "4xx": ErrorResponse,
          200: PasskeyAdditionOptionsResponse,
          401: {
            ...ErrorResponse,
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create passkey addition options",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      return reply.send(
        await createPasskeyAdditionOptions(
          { jwks, origin, pool },
          { authorization: request.headers.authorization },
        ),
      );
    },
  );

  fastify.post(
    "/passkeys/addition",
    {
      schema: {
        body: PasskeyAdditionBody,
        description:
          "Verifies both responses from one createPasskeyAdditionOptions attempt using the same live session, then stores the new passkey. Creates no session. The paired challenges are single-use. Verification failures return 422; request a new pair and repeat both ceremonies. After an unknown outcome, check listPasskeys before starting another attempt.",
        operationId: "completePasskeyAddition",
        response: {
          "4xx": ErrorResponse,
          204: Type.Null({ description: "Passkey added." }),
          400: ErrorResponse,
          401: {
            ...ErrorResponse,
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Complete passkey addition",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");

      await completePasskeyAddition(
        { jwks, origin, pool },
        { ...request.body, authorization: request.headers.authorization },
      );

      return reply.code(204).send(null);
    },
  );
}

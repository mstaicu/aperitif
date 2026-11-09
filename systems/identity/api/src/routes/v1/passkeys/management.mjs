import { Type } from "@fastify/type-provider-typebox";

import { listPasskeys } from "../../../services/passkeys/list.mjs";
import { createPasskeyRemovalOptions } from "../../../services/passkeys/removal-options.mjs";
import { completePasskeyRemoval } from "../../../services/passkeys/removal.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { PasskeyIdParams, PasskeysResponse } from "./schemas.mjs";
import {
  AuthenticationOptionsResponse,
  AuthenticationResponseJSON,
} from "./webauthn.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   jwks: import("jose").JWTVerifyGetKey,
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function passkeyManagementRoutes(
  fastify,
  { jwks, origin, pool },
) {
  fastify.get(
    "/passkeys",
    {
      schema: {
        description: "Lists passkeys belonging to the authenticated user.",
        operationId: "listPasskeys",
        response: {
          "4xx": ErrorResponse,
          200: PasskeysResponse,
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
        summary: "List passkeys",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateAccessToken(
        { jwks, pool },
        { authorization: request.headers.authorization },
      );

      reply.header("Cache-Control", "no-store");

      return reply.send({
        passkeys: await listPasskeys({ pool }, { principalId }),
      });
    },
  );

  fastify.post(
    "/passkeys/:id/removal",
    {
      schema: {
        body: AuthenticationResponseJSON,
        description:
          "Verifies a single-use response from createPasskeyRemovalOptions, bound to the selected passkey and the same live session, removes their selected passkey, and revokes all their sessions, including the current session. Sign in again with a remaining passkey. Returns 409 when removing the final passkey, 404 when the target is unavailable, and 422 when proof is rejected. Failed changes require fresh removal options and proof.",
        operationId: "completePasskeyRemoval",
        params: PasskeyIdParams,
        response: {
          "4xx": ErrorResponse,
          204: Type.Null({
            description: "Passkey removed and all sessions revoked.",
          }),
          400: ErrorResponse,
          401: {
            ...ErrorResponse,
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          404: ErrorResponse,
          409: ErrorResponse,
          422: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Complete passkey removal",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      await completePasskeyRemoval(
        { jwks, origin, pool },
        {
          authentication: request.body,
          authorization: request.headers.authorization,
          id: request.params.id,
        },
      );

      return reply.code(204).send(null);
    },
  );
  fastify.post(
    "/passkeys/:id/removal/options",
    {
      schema: {
        description:
          "Returns a single-use authentication challenge bound to this passkey and the current session for two minutes. An existing passkey must authorize removal. A login proof cannot replace this proof.",
        operationId: "createPasskeyRemovalOptions",
        params: PasskeyIdParams,
        response: {
          "4xx": ErrorResponse,
          200: AuthenticationOptionsResponse,
          400: ErrorResponse,
          401: {
            ...ErrorResponse,
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          404: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create passkey removal options",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      return reply.send(
        await createPasskeyRemovalOptions(
          { jwks, origin, pool },
          {
            authorization: request.headers.authorization,
            id: request.params.id,
          },
        ),
      );
    },
  );
}

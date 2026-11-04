import { Type } from "@fastify/type-provider-typebox";

import { listPasskeys } from "../../../services/passkeys/list.mjs";
import { removePasskey } from "../../../services/passkeys/remove.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import {
  PasskeyIdParams,
  PasskeysResponse,
  RemovePasskeyBody,
} from "./schemas.mjs";

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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: PasskeysResponse,
          401: {
            ...ErrorResponse,
            description:
              "Access token missing, invalid or expired. Call createAccessToken using a valid session; otherwise sign in.",
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
              "The request could not be completed. Try the read again later.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Try the read again later.",
          },
        },
        security: [{ bearerAuth: [] }],
        summary: "List passkeys",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const principalId = await authenticateAccessToken({
        authorization: request.headers.authorization,
        jwks,
        pool,
      });

      reply.header("Cache-Control", "no-store");

      return reply.send({
        passkeys: await listPasskeys({ pool }, { principalId }),
      });
    },
  );

  fastify.post(
    "/passkeys/:id/delete",
    {
      schema: {
        body: RemovePasskeyBody,
        description:
          "Verifies a fresh, single-use authentication response belonging to the caller, removes their selected passkey, and revokes all their sessions, including the current session. Sign in again with a remaining passkey. Preserves the final authentication method. Failed changes require a fresh proof.",
        operationId: "deletePasskey",
        params: PasskeyIdParams,
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it and obtain fresh options and proof before resubmitting.",
          },
          204: Type.Null({
            description: "Passkey removed and all sessions revoked.",
          }),
          400: {
            ...ErrorResponse,
            description:
              "The request or authentication response is malformed. Correct it and obtain fresh authentication options and proof before resubmitting.",
          },
          401: {
            ...ErrorResponse,
            description:
              "Access token missing, invalid or expired. Call createAccessToken using a valid session; otherwise sign in. Obtain fresh authentication options and proof before another deletion attempt.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
          404: {
            ...ErrorResponse,
            description:
              "The selected passkey is unavailable to the caller. Refresh the passkey list and obtain fresh proof before another deletion attempt.",
          },
          409: {
            ...ErrorResponse,
            description:
              "The final authentication method cannot be removed. Register another passkey first. Before attempting deletion again, obtain fresh authentication options and proof.",
          },
          422: {
            ...ErrorResponse,
            description:
              "Passkey verification could not be completed; failure causes are intentionally indistinguishable. Obtain fresh authentication options and proof. Do not replay the submitted proof.",
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
        security: [{ bearerAuth: [] }],
        summary: "Remove passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      await removePasskey(
        { jwks, origin, pool },
        {
          authentication: request.body.authentication,
          authorization: request.headers.authorization,
          id: request.params.id,
        },
      );

      return reply.code(204).send(null);
    },
  );
}

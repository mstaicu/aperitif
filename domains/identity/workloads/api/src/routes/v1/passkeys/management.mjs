import { Type } from "@fastify/type-provider-typebox";

import { listPasskeys } from "../../../services/passkeys/list.mjs";
import { createRemovalOptions } from "../../../services/passkeys/remove-options.mjs";
import { removePasskey } from "../../../services/passkeys/remove.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import {
  PasskeyIdParams,
  PasskeysResponse,
  RemovePasskeyBody,
} from "./schemas.mjs";
import { AuthenticationOptionsResponse } from "./webauthn.schemas.mjs";

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
    "/passkeys/:id/remove",
    {
      schema: {
        body: RemovePasskeyBody,
        description:
          "Verifies a single-use response from createPasskeyRemovalOptions, bound to the selected passkey and the same live session, removes their selected passkey, and revokes all their sessions, including the current session. Sign in again with a remaining passkey. Preserves the final authentication method. Failed changes require a fresh proof.",
        operationId: "removePasskey",
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
              "The request or authentication response is malformed. Correct it and obtain fresh removal options and proof before resubmitting.",
          },
          401: {
            ...ErrorResponse,
            description:
              "Access token missing, invalid or expired. Call createAccessToken using a valid session; otherwise sign in. Obtain fresh removal options and proof before another deletion attempt.",
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
              "The final authentication method cannot be removed. Register another passkey first. Before attempting deletion again, obtain fresh removal options and proof.",
          },
          422: {
            ...ErrorResponse,
            description:
              "Passkey verification could not be completed; failure causes are intentionally indistinguishable. Obtain fresh removal options and proof. Do not replay the submitted proof.",
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
  fastify.post(
    "/passkeys/:id/remove/options",
    {
      schema: {
        description:
          "Returns a single-use authentication challenge bound to this passkey and the current session for two minutes. An existing passkey must authorize removal. A login proof cannot replace this proof.",
        operationId: "createPasskeyRemovalOptions",
        params: PasskeyIdParams,
        response: {
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before requesting fresh removal options.",
          },
          200: AuthenticationOptionsResponse,
          400: {
            ...ErrorResponse,
            description:
              "The passkey ID is malformed. Correct it before requesting removal options.",
          },
          401: {
            ...ErrorResponse,
            description:
              "A live access token is required. Obtain one using a valid session or sign in.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": { enum: ["Bearer"], type: "string" },
            },
          },
          404: {
            ...ErrorResponse,
            description:
              "The selected passkey is unavailable to the caller. Refresh the passkey list.",
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
        summary: "Start passkey removal",
        tags: ["passkeys"],
      },
    },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      return reply.send(
        await createRemovalOptions(
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

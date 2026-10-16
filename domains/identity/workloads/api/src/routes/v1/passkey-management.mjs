import { Type } from "@fastify/type-provider-typebox";

import { authenticate } from "../../services/passkeys/authentication.mjs";
import { listPasskeys } from "../../services/passkeys/list.mjs";
import { removePasskey } from "../../services/passkeys/remove.mjs";
import { renamePasskey } from "../../services/passkeys/rename.mjs";
import { authenticateAccessToken } from "../../services/sessions/authenticate.mjs";
import { ProblemResponse } from "../problem-details.mjs";
import {
  Passkey,
  PasskeyIdParams,
  PasskeysResponse,
  RemovePasskeyBody,
  RenamePasskeyBody,
} from "./passkeys.schemas.mjs";

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
          200: PasskeysResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
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

  fastify.patch(
    "/passkeys/:id",
    {
      schema: {
        body: RenamePasskeyBody,
        description: "Changes the name of an authenticated user's passkey.",
        operationId: "renamePasskey",
        params: PasskeyIdParams,
        response: {
          200: Passkey,
          400: ProblemResponse,
          401: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Rename passkey",
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

      return reply.send(
        await renamePasskey(
          { pool },
          { id: request.params.id, name: request.body.name, principalId },
        ),
      );
    },
  );

  fastify.post(
    "/passkeys/:id/delete",
    {
      schema: {
        body: RemovePasskeyBody,
        description:
          "Verifies a fresh, single-use authentication response belonging to the caller and removes their selected passkey. Preserves the final authentication method. Failed changes require a fresh proof.",
        operationId: "deletePasskey",
        params: PasskeyIdParams,
        response: {
          204: Type.Null({ description: "Passkey removed." }),
          400: ProblemResponse,
          401: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Remove passkey",
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

      const authenticatedPrincipalId = await authenticate(
        { origin, pool },
        request.body.authentication,
      );

      if (authenticatedPrincipalId !== principalId) {
        throw new Error("AUTHENTICATION_FAILED");
      }

      await removePasskey({ pool }, { id: request.params.id, principalId });

      return reply.code(204).send(null);
    },
  );
}

import { createPasskeyOptions } from "../../services/passkeys/add-options.mjs";
import { addPasskey } from "../../services/passkeys/add.mjs";
import { listPasskeys } from "../../services/passkeys/list.mjs";
import { removePasskey } from "../../services/passkeys/remove.mjs";
import { renamePasskey } from "../../services/passkeys/rename.mjs";
import { authenticateSession } from "../../services/sessions/authenticate.mjs";
import { ProblemResponse } from "../problem-details.mjs";
import {
  AddPasskeyBody,
  Passkey,
  PasskeyIdParams,
  PasskeysResponse,
  RegistrationOptionsResponse,
  RenamePasskeyBody,
} from "./passkeys.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   origin: string,
 * }>}
 */
export default async function passkeyManagementRoutes(
  fastify,
  { origin, pool },
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
        security: [{ sessionTokenAuth: [] }],
        summary: "List passkeys",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateSession({
        authorization: request.headers.authorization,
        pool,
      });

      reply.header("Cache-Control", "no-store");

      return reply.send({
        passkeys: await listPasskeys({ pool }, { principalId }),
      });
    },
  );

  fastify.post(
    "/passkeys/options",
    {
      schema: {
        description:
          "Creates WebAuthn registration options for adding a passkey to the authenticated user.",
        operationId: "createPasskeyOptions",
        response: {
          200: RegistrationOptionsResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ sessionTokenAuth: [] }],
        summary: "Create additional passkey options",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateSession({
        authorization: request.headers.authorization,
        pool,
      });

      reply.header("Cache-Control", "no-store");

      return reply.send(
        await createPasskeyOptions({ origin, pool }, { principalId }),
      );
    },
  );

  fastify.post(
    "/passkeys",
    {
      schema: {
        body: AddPasskeyBody,
        description:
          "Verifies and adds a passkey to the authenticated user without creating another session.",
        operationId: "createPasskey",
        response: {
          201: Passkey,
          400: ProblemResponse,
          401: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ sessionTokenAuth: [] }],
        summary: "Add passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateSession({
        authorization: request.headers.authorization,
        pool,
      });

      reply.header("Cache-Control", "no-store");

      return reply.code(201).send(
        await addPasskey(
          { origin, pool },
          {
            credential: request.body.credential,
            name: request.body.name,
            principalId,
          },
        ),
      );
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
        security: [{ sessionTokenAuth: [] }],
        summary: "Rename passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateSession({
        authorization: request.headers.authorization,
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

  fastify.delete(
    "/passkeys/:id",
    {
      schema: {
        description:
          "Removes an authenticated user's passkey while preserving their final authentication method.",
        operationId: "deletePasskey",
        params: PasskeyIdParams,
        response: {
          204: { description: "Passkey removed." },
          400: ProblemResponse,
          401: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ sessionTokenAuth: [] }],
        summary: "Remove passkey",
        tags: ["passkeys"],
      },
    },
    async function (request, reply) {
      const { principal_id: principalId } = await authenticateSession({
        authorization: request.headers.authorization,
        pool,
      });

      await removePasskey({ pool }, { id: request.params.id, principalId });

      return reply.code(204).send();
    },
  );
}

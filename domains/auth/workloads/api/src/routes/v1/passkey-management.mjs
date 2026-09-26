import { createHash } from "node:crypto";

import { ProblemResponse } from "../../platform/problem-details.mjs";
import { createPasskeyOptions } from "../../services/passkeys/add-options.mjs";
import { addPasskey } from "../../services/passkeys/add.mjs";
import { listPasskeys } from "../../services/passkeys/list.mjs";
import { removePasskey } from "../../services/passkeys/remove.mjs";
import { renamePasskey } from "../../services/passkeys/rename.mjs";
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
      const [scheme, token, extra] = (
        request.headers.authorization ?? ""
      ).split(" ");

      if (scheme !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const tokenHash = createHash("sha256").update(token).digest();
      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT user_id
          FROM sessions
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const userId = session.user_id;

      reply.header("Cache-Control", "no-store");

      return reply.send({
        passkeys: await listPasskeys({ pool }, { userId }),
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
      const [scheme, token, extra] = (
        request.headers.authorization ?? ""
      ).split(" ");

      if (scheme !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const tokenHash = createHash("sha256").update(token).digest();
      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT user_id
          FROM sessions
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const userId = session.user_id;

      reply.header("Cache-Control", "no-store");
      reply.header("Pragma", "no-cache");

      return reply.send(
        await createPasskeyOptions({ origin, pool }, { userId }),
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
      const [scheme, token, extra] = (
        request.headers.authorization ?? ""
      ).split(" ");

      if (scheme !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const tokenHash = createHash("sha256").update(token).digest();
      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT user_id
          FROM sessions
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const userId = session.user_id;

      reply.header("Cache-Control", "no-store");

      return reply.code(201).send(
        await addPasskey(
          { origin, pool },
          {
            credential: request.body.credential,
            name: request.body.name,
            userId,
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
      const [scheme, token, extra] = (
        request.headers.authorization ?? ""
      ).split(" ");

      if (scheme !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const tokenHash = createHash("sha256").update(token).digest();
      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT user_id
          FROM sessions
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const userId = session.user_id;

      reply.header("Cache-Control", "no-store");

      return reply.send(
        await renamePasskey(
          { pool },
          { id: request.params.id, name: request.body.name, userId },
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
          204: {
            description: "Passkey removed.",
            type: "null",
          },
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
      const [scheme, token, extra] = (
        request.headers.authorization ?? ""
      ).split(" ");

      if (scheme !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      const tokenHash = createHash("sha256").update(token).digest();
      const {
        rows: [session],
      } = await pool.query(
        `
          SELECT user_id
          FROM sessions
          WHERE token_hash = $1
            AND revoked_at IS NULL
            AND expires_at > NOW()
        `,
        [tokenHash],
      );

      if (!session) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const userId = session.user_id;

      await removePasskey({ pool }, { id: request.params.id, userId });

      return reply.code(204).send(null);
    },
  );
}

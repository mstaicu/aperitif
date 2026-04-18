import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { RefreshBody, RefreshResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/sessions/index.mjs").SessionsRuntime} SessionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{sessions: SessionsRuntime}} opts
 */
export default async function (fastify, { sessions }) {
  fastify.post(
    "/refresh",
    {
      schema: {
        body: RefreshBody,
        description: "Exchanges a valid refresh token for a new refresh token.",
        operationId: "refreshSession",
        response: {
          200: RefreshResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Refresh session",
        tags: ["sessions"],
      },
    },
    async function (request, reply) {
      const input = {
        refresh_token: request.body.refresh_token,
      };

      try {
        reply.header("Cache-Control", "no-store");

        return reply.send(await sessions.refresh(input));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

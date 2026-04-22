import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { RefreshBody, RefreshResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../domains/sessions/index.mjs").SessionsDomain} SessionsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{sessions: SessionsDomain}} opts
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
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
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
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Invalid refresh token",
            type: "/problems/invalid-refresh-token",
          });
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.type("application/problem+json").code(503).send({
            status: 503,
            title: "Database unavailable",
            type: "/problems/database-unavailable",
          });
        }

        return reply.type("application/problem+json").code(500).send({
          status: 500,
          title: "Internal server error",
          type: "/problems/internal-server-error",
        });
      }
    },
  );
}

import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { RefreshResponse } from "./schemas.mjs";

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
        description:
          "Rotate a refresh token provided in the Authorization bearer header and return the newly issued refresh token for the same identity session.",
        operationId: "refreshSession",
        response: {
          200: RefreshResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ refreshTokenAuth: [] }],
        summary: "Rotate refresh token",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      try {
        const [type, token] = (req.headers.authorization || "").split(" ");

        if (type !== "Bearer" || !token) {
          throw new Error("INVALID_AUTHORIZATION_HEADER");
        }

        reply.header("Cache-Control", "no-store");

        return reply.send(
          await sessions.refresh({
            refresh_token: token,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_AUTHORIZATION_HEADER") {
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Invalid authorization header",
            type: "/problems/invalid-authorization-header",
          });
        }

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

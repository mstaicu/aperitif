import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SessionTokenBody, SessionTokenResponse } from "./schemas.mjs";

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
    "/token",
    {
      schema: {
        body: SessionTokenBody,
        description:
          "Exchange a refresh token provided in the Authorization bearer header for a short-lived audience-scoped access token. The request body should contain only the target audience.",
        operationId: "exchangeSessionToken",
        response: {
          200: SessionTokenResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        summary: "Mint access token",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) {
        return reply.code(401).send(null);
      }

      const input = {
        audience: req.body.audience,
        refresh_token: token,
      };

      try {
        reply.header("Cache-Control", "no-store");

        return reply.send(await sessions.createAccessToken(input));
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_AUDIENCE") {
          return reply.code(400).send(null);
        }

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

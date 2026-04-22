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
    },
  );
}

import { ProblemResponse } from "../../problem-details.mjs";
import { RefreshTokenResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   sessions: import("../../../services/sessions/index.mjs").SessionsService,
 *   prefix: string,
 * }} opts
 */
export function registerRefreshTokenRoute(fastify, { prefix, sessions }) {
  fastify.post(
    `${prefix}/refresh-token`,
    {
      schema: {
        description:
          "Rotate a refresh token supplied in the Authorization bearer header and return the newly issued refresh token for the same identity session.",
        operationId: "rotateSessionRefreshToken",
        response: {
          200: RefreshTokenResponse,
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
        await sessions.rotateRefreshToken({
          refresh_token: token,
        }),
      );
    },
  );
}

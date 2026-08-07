import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AccessTokenResponse } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   sessions: import("../../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export function registerAccessTokenRoute(fastify, { sessions }) {
  fastify.post(
    "/v1/sessions/access-token",
    {
      schema: {
        description:
          "Create a short-lived access token from the session refresh token supplied in the Authorization bearer header.",
        operationId: "createSessionAccessToken",
        response: {
          200: AccessTokenResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ refreshTokenAuth: [] }],
        summary: "Create access token",
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
        await sessions.createAccessToken({ refresh_token: token }),
      );
    },
  );
}

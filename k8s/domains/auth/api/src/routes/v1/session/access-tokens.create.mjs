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
    "/v1/session/access-tokens",
    {
      schema: {
        description:
          "Creates a short-lived access token for the session represented by the bearer credential.",
        operationId: "createAccessToken",
        response: {
          200: AccessTokenResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ sessionTokenAuth: [] }],
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
        await sessions.createAccessToken({ session_token: token }),
      );
    },
  );
}

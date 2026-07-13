import { ProblemResponse } from "../../problem-details.mjs";
import { AccessTokenResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   sessions: import("../../../services/sessions/index.mjs").SessionsService,
 *   prefix: string,
 * }} opts
 */
export function registerAccessTokenRoute(fastify, { prefix, sessions }) {
  fastify.post(
    `${prefix}/access-token`,
    {
      schema: {
        description:
          "Create a short-lived access token and rotate the refresh token supplied in the Authorization bearer header.",
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

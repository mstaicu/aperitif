import { ProblemResponse } from "../../../platform/problem-details.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   sessions: import("../../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export function registerRevokeSessionRoute(fastify, { sessions }) {
  fastify.delete(
    "/v1/sessions",
    {
      schema: {
        description:
          "Revoke the session represented by the refresh token supplied in the Authorization bearer header.",
        operationId: "revokeSession",
        response: {
          204: {
            description: "Session revoked.",
            type: "null",
          },
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ refreshTokenAuth: [] }],
        summary: "Revoke session",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      await sessions.revokeSession({ refresh_token: token });

      return reply.code(204).send(null);
    },
  );
}

import { ProblemResponse } from "../../../platform/problem-details.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   sessions: import("../../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export function registerRevokeSessionRoute(fastify, { sessions }) {
  fastify.delete(
    "/v1/session",
    {
      schema: {
        description:
          "Revokes the session represented by the bearer credential.",
        operationId: "deleteSession",
        response: {
          204: {
            description: "Session revoked.",
            type: "null",
          },
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ sessionTokenAuth: [] }],
        summary: "Delete session",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token] = (req.headers.authorization || "").split(" ");

      if (type !== "Bearer" || !token) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      await sessions.revokeSession({ session_token: token });

      return reply.code(204).send(null);
    },
  );
}

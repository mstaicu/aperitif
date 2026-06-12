import { ProblemResponse } from "../../../../problem-details.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../services/sessions/index.mjs").SessionsService} SessionsService
 */

/**
 * @param {Fastify} fastify
 * @param {{sessions: SessionsService}} opts
 */
export default async function (fastify, { sessions }) {
  fastify.delete(
    "",
    {
      schema: {
        description:
          "Revoke the identity session represented by the refresh token supplied in the Authorization bearer header.",
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

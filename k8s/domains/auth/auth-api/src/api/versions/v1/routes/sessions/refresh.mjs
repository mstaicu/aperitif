import { ErrorResponse, RefreshBody, RefreshResponse } from "../../schemas.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/refresh",
    {
      schema: {
        body: RefreshBody,
        description: "Exchanges a valid refresh token for a new refresh token.",
        operationId: "refreshSession",
        response: {
          200: RefreshResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Refresh session",
        tags: ["sessions"],
      },
    },
    async function (request, reply) {
      try {
        const result = await runtime.sessions.refresh(request.body);

        reply.header("Cache-Control", "no-store");

        return reply.send(result);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

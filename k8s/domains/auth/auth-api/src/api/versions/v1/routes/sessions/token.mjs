import {
  ErrorResponse,
  SessionTokenBody,
  SessionTokenResponse,
} from "../../schemas.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  fastify.post(
    "/token",
    {
      schema: {
        body: SessionTokenBody,
        description:
          "Exchange a refresh token for a short-lived audience-scoped access token.",
        operationId: "exchangeSessionToken",
        response: {
          200: SessionTokenResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          500: ErrorResponse,
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

      try {
        const result = await runtime.sessions.createAccessToken({
          audience: req.body.audience,
          refresh_token: token,
        });

        reply.header("Cache-Control", "no-store");

        return reply.send(result);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_REFRESH_TOKEN" || code === "SESSION_NOT_FOUND") {
          return reply.code(401).send(null);
        }

        if (code === "INVALID_AUDIENCE") {
          return reply.code(403).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

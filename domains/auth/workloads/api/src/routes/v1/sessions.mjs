import { ProblemResponse } from "../../platform/problem-details.mjs";
import { createAccessToken } from "../../services/sessions/create-access-token.mjs";
import { revokeSession } from "../../services/sessions/revoke.mjs";
import { AccessTokenResponse } from "./sessions.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../platform/jwt-keys.mjs").JwtKeys["signingKey"],
 * }>}
 */
export default async function sessionsRoutes(fastify, { pool, signingKey }) {
  fastify.post(
    "/session/access-tokens",
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
        await createAccessToken({ pool, signingKey }, { session_token: token }),
      );
    },
  );

  fastify.delete(
    "/session",
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

      await revokeSession({ pool }, { session_token: token });

      return reply.code(204).send(null);
    },
  );
}

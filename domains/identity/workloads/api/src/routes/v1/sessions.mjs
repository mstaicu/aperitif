import { SignJWT } from "jose";

import { authenticateSession } from "../../services/sessions/authenticate.mjs";
import { revokeSession } from "../../services/sessions/revoke.mjs";
import { ProblemResponse } from "../problem-details.mjs";
import { AccessTokenResponse } from "./sessions.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../jwks.mjs").JwtKeys["signingKey"],
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
      const session = await authenticateSession({
        authorization: req.headers.authorization,
        pool,
      });

      reply.header("Cache-Control", "no-store");

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = Math.min(
        now + 300,
        Math.floor(session.expires_at.getTime() / 1000),
      );

      if (expiresAt <= now) {
        throw new Error("SESSION_NOT_FOUND");
      }

      const access_token = await new SignJWT({
        sid: session.id,
        sub: session.principal_id,
      })
        .setProtectedHeader({
          alg: "ES256",
          kid: signingKey.kid,
        })
        .setIssuedAt(now)
        .setExpirationTime(expiresAt)
        .sign(signingKey.privateKey);

      return reply.send({
        access_token,
        expires_in: expiresAt - now,
      });
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
          204: { description: "Session revoked." },
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
      const [type, token, extra] = (req.headers.authorization ?? "").split(" ");

      if (type !== "Bearer" || !token || extra) {
        throw new Error("INVALID_AUTHORIZATION_HEADER");
      }

      await revokeSession({ pool }, { session_token: token });

      return reply.code(204).send();
    },
  );
}

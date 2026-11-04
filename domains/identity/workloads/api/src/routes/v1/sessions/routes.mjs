import { Type } from "@fastify/type-provider-typebox";
import createError from "http-errors";
import { SignJWT } from "jose";

import { authenticateSession } from "../../../services/sessions/authenticate.mjs";
import { revokeSession } from "../../../services/sessions/revoke.mjs";
import { ErrorResponse } from "../../errors.mjs";
import { AccessTokenResponse } from "./schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   signingKey: import("../../../jwks.mjs").JwtKeys["signingKey"],
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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: AccessTokenResponse,
          401: {
            ...ErrorResponse,
            description:
              "Session credential missing, invalid or expired. Supply a valid session token; otherwise sign in again.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
          500: {
            ...ErrorResponse,
            description:
              "An access token could not be returned. Try again later using a valid session.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Try again later using a valid session.",
          },
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
        throw new createError.Unauthorized();
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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          204: Type.Null({ description: "Session revoked." }),
          401: {
            ...ErrorResponse,
            description:
              "Session credential missing, invalid or expired. Supply the session token to revoke; an invalid session cannot be used to obtain access tokens. Sign in again if needed.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
          500: {
            ...ErrorResponse,
            description:
              "The request failed; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
        },
        security: [{ sessionTokenAuth: [] }],
        summary: "Delete session",
        tags: ["sessions"],
      },
    },
    async function (req, reply) {
      const [type, token, extra] = (req.headers.authorization ?? "").split(
        / +/,
      );

      if (type.toLowerCase() !== "bearer" || !token || extra) {
        throw new createError.Unauthorized();
      }

      await revokeSession({ pool }, { session_token: token });

      return reply.code(204).send(null);
    },
  );
}

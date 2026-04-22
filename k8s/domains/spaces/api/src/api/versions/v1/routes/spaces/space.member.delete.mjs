import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { EmptyResponse, ProblemResponse } from "../../../../shared/schemas.mjs";
import { SpaceMemberParams } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesDomain}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  fastify.delete(
    "/:spaceId/members/:userId",
    {
      schema: {
        description:
          "Remove a membership from a space. Only owners can remove other members, owners cannot self-target through this endpoint, and removing an already-absent membership is treated as a no-op.",
        operationId: "deleteSpaceMember",
        params: SpaceMemberParams,
        response: {
          204: EmptyResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Delete space membership",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        await spaces.deleteMember({
          currentUserId,
          spaceId: req.params.spaceId,
          userId: req.params.userId,
        });

        return reply.code(204).send(null);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Invalid access token",
            type: "/problems/invalid-access-token",
          });
        }

        if (code === "FORBIDDEN") {
          return reply.type("application/problem+json").code(403).send({
            status: 403,
            title: "Forbidden",
            type: "/problems/forbidden",
          });
        }

        if (code === "SPACE_NOT_FOUND") {
          return reply.type("application/problem+json").code(404).send({
            status: 404,
            title: "Space not found",
            type: "/problems/space-not-found",
          });
        }

        if (code === "LAST_OWNER") {
          return reply.type("application/problem+json").code(409).send({
            status: 409,
            title: "Cannot remove last owner",
            type: "/problems/last-owner",
          });
        }

        if (code === "FORBIDDEN_SELF_TARGET") {
          return reply.type("application/problem+json").code(403).send({
            status: 403,
            title: "Cannot self-target membership removal",
            type: "/problems/forbidden-self-target",
          });
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.type("application/problem+json").code(503).send({
            status: 503,
            title: "Database unavailable",
            type: "/problems/database-unavailable",
          });
        }

        return reply.type("application/problem+json").code(500).send({
          status: 500,
          title: "Internal server error",
          type: "/problems/internal-server-error",
        });
      }
    },
  );
}

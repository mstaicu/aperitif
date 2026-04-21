import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { EmptyResponse, ErrorResponse } from "../../../../shared/schemas.mjs";
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
        description: "Remove a member from a space. Intended for owners.",
        operationId: "deleteSpaceMember",
        params: SpaceMemberParams,
        response: {
          204: EmptyResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Delete membership",
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
          return reply.code(401).send(null);
        }

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "SPACE_NOT_FOUND" || code === "MEMBERSHIP_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "LAST_OWNER") {
          return reply.code(409).send(null);
        }

        if (code === "FORBIDDEN_SELF_TARGET") {
          return reply.code(403).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

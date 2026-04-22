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
    },
  );
}

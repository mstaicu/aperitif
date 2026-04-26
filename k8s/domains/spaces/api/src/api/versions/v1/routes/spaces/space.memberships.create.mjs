import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  CreateSpaceMembershipBody,
  SpaceMembershipParams,
  SpaceMembershipResponse,
} from "./schemas.mjs";

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
  fastify.put(
    "/:spaceId/memberships/:userId",
    {
      schema: {
        body: CreateSpaceMembershipBody,
        description:
          "Ensure a direct membership exists in a space for an existing global user identity. Repeating the same request with the same role is a no-op. Changing an existing role is not supported here.",
        operationId: "createSpaceMembership",
        params: SpaceMembershipParams,
        response: {
          200: SpaceMembershipResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create space membership",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(200).send(
        await spaces.createMembership({
          currentUserId,
          role: req.body.role,
          spaceId: req.params.spaceId,
          userId: req.params.userId,
        }),
      );
    },
  );
}

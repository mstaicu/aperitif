import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  CreateSpaceMemberBody,
  SpaceMemberParams,
  SpaceMemberResponse,
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
    "/:spaceId/members/:userId",
    {
      schema: {
        body: CreateSpaceMemberBody,
        description:
          "Create an immediate membership in a space for an existing global user identity. Only owners can grant memberships.",
        operationId: "createSpaceMember",
        params: SpaceMemberParams,
        response: {
          201: SpaceMemberResponse,
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
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.code(201).send(
          await spaces.createMember({
            currentUserId,
            role: req.body.role,
            spaceId: req.params.spaceId,
            userId: req.params.userId,
          }),
        );
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

        if (code === "MEMBERSHIP_ALREADY_EXISTS") {
          return reply.type("application/problem+json").code(409).send({
            status: 409,
            title: "Membership already exists",
            type: "/problems/membership-already-exists",
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

import { authenticate } from "../../../../../jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import {
  CreateSpaceMemberBody,
  SpaceMemberResponse,
  SpaceParams,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesRuntime}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  fastify.post(
    "/:spaceId/members",
    {
      schema: {
        body: CreateSpaceMemberBody,
        description:
          "Create an immediate membership in a space for an existing global user identity.",
        operationId: "createSpaceMember",
        params: SpaceParams,
        response: {
          201: SpaceMemberResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create membership",
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
            userId: req.body.user_id,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "SPACE_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "MEMBERSHIP_ALREADY_EXISTS") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { EmptyResponse, ProblemResponse } from "../../../../shared/schemas.mjs";
import { SpaceParams } from "./schemas.mjs";

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
    "/:spaceId",
    {
      schema: {
        description:
          "Delete a space. The caller must own the space, still belong to another space, and the target space must have no open admissions.",
        operationId: "deleteSpace",
        params: SpaceParams,
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
        summary: "Delete space",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      await spaces.delete({
        currentUserId,
        spaceId: req.params.spaceId,
      });

      return reply.code(204).send(null);
    },
  );
}

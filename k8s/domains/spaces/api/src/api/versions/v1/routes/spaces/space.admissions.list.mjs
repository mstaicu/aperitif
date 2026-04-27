import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { SpaceAdmissionsResponse, SpaceParams } from "./schemas.mjs";

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
  fastify.get(
    "/:spaceId/admissions",
    {
      schema: {
        description:
          "List admissions for a space, including their current requirement rows. Only space owners can inspect admission state for other users.",
        operationId: "listSpaceAdmissions",
        params: SpaceParams,
        response: {
          200: SpaceAdmissionsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List space admissions",
        tags: ["admissions", "spaces"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await spaces.listAdmissions({
          currentUserId,
          spaceId: req.params.spaceId,
        }),
      );
    },
  );
}

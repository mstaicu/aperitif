import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AccountRequirementParams,
  AccountRequirementsResponse,
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
  fastify.post(
    "/:accountId/requirements/:type/complete",
    {
      schema: {
        description:
          "Mark an account activation requirement completed. Account owners can use this synchronous route shape; later event consumers should reuse this transaction behind an internal worker path.",
        operationId: "completeAccountRequirement",
        params: AccountRequirementParams,
        response: {
          200: AccountRequirementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Complete account requirement",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await spaces.completeAccountRequirement({
          accountId: req.params.accountId,
          currentUserId,
          type: req.params.type,
        }),
      );
    },
  );
}

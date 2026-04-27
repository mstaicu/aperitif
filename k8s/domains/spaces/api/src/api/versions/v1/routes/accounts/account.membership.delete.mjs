import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { EmptyResponse, ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountMembershipParams } from "./schemas.mjs";

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
    "/:accountId/memberships/:userId",
    {
      schema: {
        description:
          "Remove account-level authority. Owners cannot self-target through this endpoint, and removing an already-absent membership is a no-op.",
        operationId: "deleteAccountMembership",
        params: AccountMembershipParams,
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
        summary: "Delete account membership",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      await spaces.deleteAccountMembership({
        accountId: req.params.accountId,
        currentUserId,
        userId: req.params.userId,
      });

      return reply.code(204).send(null);
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AccountMembershipParams,
  AccountMembershipResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/tenancy/index.mjs").TenancyDomain} TenancyDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{accounts: TenancyDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { accounts, jwks }) {
  fastify.get(
    "/:accountId/memberships/:userId",
    {
      schema: {
        description:
          "Fetch a specific account membership. Owners can inspect any membership; non-owners can inspect only their own membership by using their identity user id.",
        operationId: "getAccountMembership",
        params: AccountMembershipParams,
        response: {
          200: AccountMembershipResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get account membership",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accounts.getAccountMembership({
          accountId: req.params.accountId,
          currentUserId,
          userId: req.params.userId,
        }),
      );
    },
  );
}

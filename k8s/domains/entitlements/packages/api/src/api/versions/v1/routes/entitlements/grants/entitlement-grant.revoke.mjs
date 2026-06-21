import { authenticateOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  RevokeAccountEntitlementsBody,
  RevokeAccountEntitlementsResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/account-entitlements/index.mjs").AccountEntitlementsService} AccountEntitlementsService
 */

/**
 * @param {Fastify} fastify
 * @param {{accountEntitlements: AccountEntitlementsService, jwks: Jwks}} opts
 */
export default async function (fastify, { accountEntitlements, jwks }) {
  fastify.delete(
    "",
    {
      schema: {
        body: RevokeAccountEntitlementsBody,
        description:
          "Platform operator command that revokes current account entitlement grants and recomputes effective account entitlements.",
        operationId: "revokeAccountEntitlements",
        response: {
          200: RevokeAccountEntitlementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Revoke account entitlement grants",
        tags: ["entitlements"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accountEntitlements.revokeAccountEntitlements({
          accountId: req.body.account_id,
          entitlements: req.body.entitlements,
        }),
      );
    },
  );
}

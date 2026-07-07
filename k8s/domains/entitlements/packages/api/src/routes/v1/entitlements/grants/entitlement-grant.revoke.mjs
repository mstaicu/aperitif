import { ProblemResponse } from "../../../../api/problem-details.mjs";
import { authenticateOperator } from "../../../../platform/security/jwt.mjs";
import {
  RevokeAccountEntitlementsBody,
  RevokeAccountEntitlementsResponse,
} from "./schemas.mjs";

/**
 * @param {import("../../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   accountEntitlements: import("../../../../services/account-entitlements/index.mjs").AccountEntitlementsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export function registerRevokeAccountEntitlementsRoute(
  fastify,
  { accountEntitlements, jwks, prefix },
) {
  fastify.post(
    `${prefix}/grants/revoke`,
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

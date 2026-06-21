import { authenticateOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  AddAccountEntitlementsBody,
  AddAccountEntitlementsResponse,
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
  fastify.post(
    "",
    {
      schema: {
        body: AddAccountEntitlementsBody,
        description:
          "Platform operator command that adds current account entitlement grants and recomputes effective account entitlements.",
        operationId: "addAccountEntitlements",
        response: {
          200: AddAccountEntitlementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Add account entitlement grants",
        tags: ["entitlements"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accountEntitlements.addAccountEntitlements({
          accountId: req.body.account_id,
          entitlements: req.body.entitlements,
        }),
      );
    },
  );
}

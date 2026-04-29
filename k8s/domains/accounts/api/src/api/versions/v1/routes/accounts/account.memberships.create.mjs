import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AccountMembershipParams,
  AccountMembershipResponse,
  CreateAccountMembershipBody,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/accounts/index.mjs").AccountsDomain} AccountsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{accounts: AccountsDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { accounts, jwks }) {
  fastify.put(
    "/:accountId/memberships/:userId",
    {
      schema: {
        body: CreateAccountMembershipBody,
        description:
          "Ensure a user has account-level authority. Repeating the same request with the same role is a no-op; changing an existing role is not supported here.",
        operationId: "createAccountMembership",
        params: AccountMembershipParams,
        response: {
          200: AccountMembershipResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create account membership",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(200).send(
        await accounts.createAccountMembership({
          accountId: req.params.accountId,
          currentUserId,
          role: req.body.role,
          userId: req.params.userId,
        }),
      );
    },
  );
}

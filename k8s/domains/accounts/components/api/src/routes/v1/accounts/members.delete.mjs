import { authenticate } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AccountMemberParams } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerDeleteMemberRoute(fastify, { accounts, jwks }) {
  fastify.delete(
    "/v1/accounts/:account_id/members/:user_id",
    {
      schema: {
        description: "Remove a member from an account.",
        operationId: "deleteAccountMember",
        params: AccountMemberParams,
        response: {
          204: {
            description: "Account member removed.",
            type: "null",
          },
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Delete account member",
        tags: ["members"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      await accounts.deleteMember({
        accountId: req.params.account_id,
        currentUserId,
        userId: req.params.user_id,
      });

      return reply.code(204).send(null);
    },
  );
}

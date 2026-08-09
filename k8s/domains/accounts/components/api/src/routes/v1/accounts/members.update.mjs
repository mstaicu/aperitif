import { authenticate } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import {
  AccountMemberParams,
  MemberResponse,
  UpdateMemberBody,
} from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerUpdateMemberRoute(fastify, { accounts, jwks }) {
  fastify.patch(
    "/v1/accounts/:account_id/members/:user_id",
    {
      schema: {
        body: UpdateMemberBody,
        description: "Change an account member's generic role.",
        operationId: "updateAccountMember",
        params: AccountMemberParams,
        response: {
          200: MemberResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Update account member",
        tags: ["members"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accounts.updateMember({
          accountId: req.params.account_id,
          currentUserId,
          role: req.body.role,
          userId: req.params.user_id,
        }),
      );
    },
  );
}

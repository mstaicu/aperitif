import { authenticate } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AccountParams, MembersResponse } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerListMembersRoute(fastify, { accounts, jwks }) {
  fastify.get(
    "/v1/accounts/:account_id/members",
    {
      schema: {
        description: "List members of an account managed by the caller.",
        operationId: "listAccountMembers",
        params: AccountParams,
        response: {
          200: MembersResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List account members",
        tags: ["members"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accounts.listMembers({
          accountId: req.params.account_id,
          currentUserId,
        }),
      );
    },
  );
}

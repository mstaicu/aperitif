import { authenticate } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { AccountParams, CreateMemberBody, MemberResponse } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerCreateMemberRoute(fastify, { accounts, jwks }) {
  fastify.post(
    "/v1/accounts/:account_id/members",
    {
      schema: {
        body: CreateMemberBody,
        description: "Add an existing user to an account.",
        operationId: "createAccountMember",
        params: AccountParams,
        response: {
          201: MemberResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create account member",
        tags: ["members"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await accounts.createMember({
          accountId: req.params.account_id,
          currentUserId,
          role: req.body.role,
          userId: req.body.user_id,
        }),
      );
    },
  );
}

import { ProblemResponse } from "../../../api/problem-details.mjs";
import { authenticate } from "../../../platform/security/jwt.mjs";
import { AccountsResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export function registerListAccountsRoute(fastify, { accounts, jwks, prefix }) {
  fastify.get(
    prefix,
    {
      schema: {
        description:
          "List accounts where the authenticated caller has account-level authority.",
        operationId: "listAccounts",
        response: {
          200: AccountsResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List caller accounts",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await accounts.listAccounts({ currentUserId }));
    },
  );
}

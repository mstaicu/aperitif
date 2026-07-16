import { authenticate } from "../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../problem-details.mjs";
import { AccountsResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerListAccountsRoute(fastify, { accounts, jwks }) {
  fastify.get(
    "/v1/accounts",
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

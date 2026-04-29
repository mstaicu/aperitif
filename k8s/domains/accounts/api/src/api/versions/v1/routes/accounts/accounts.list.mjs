import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountsResponse } from "./schemas.mjs";

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
  fastify.get(
    "/",
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

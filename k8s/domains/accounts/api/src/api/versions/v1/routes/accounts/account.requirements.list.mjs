import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountParams, AccountRequirementsResponse } from "./schemas.mjs";

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
    "/:accountId/requirements",
    {
      schema: {
        description:
          "List account activation requirements. Account members can inspect the gates that block account activation.",
        operationId: "listAccountRequirements",
        params: AccountParams,
        response: {
          200: AccountRequirementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List account requirements",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accounts.listAccountRequirements({
          accountId: req.params.accountId,
          currentUserId,
        }),
      );
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { CreateAccountBody, CreateAccountResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/accounts/index.mjs").AccountsService} AccountsService
 */

/**
 * @param {Fastify} fastify
 * @param {{accounts: AccountsService, jwks: Jwks}} opts
 */
export default async function (fastify, { accounts, jwks }) {
  fastify.post(
    "",
    {
      schema: {
        body: CreateAccountBody,
        description:
          "Create a account as the authority root for account-scoped access.",
        operationId: "createAccount",
        response: {
          201: CreateAccountResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create account",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await accounts.createAccount({
          currentUserId,
          name: req.body.name,
        }),
      );
    },
  );
}

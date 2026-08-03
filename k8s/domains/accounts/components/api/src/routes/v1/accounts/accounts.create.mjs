import { authenticate } from "../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../problem-details.mjs";
import { CreateAccountBody, CreateAccountResponse } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerCreateAccountRoute(fastify, { accounts, jwks }) {
  fastify.post(
    "/v1/accounts",
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
          type: req.body.type,
        }),
      );
    },
  );
}

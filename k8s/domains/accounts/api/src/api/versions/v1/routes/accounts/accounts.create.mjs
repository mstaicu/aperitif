import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountResponse, CreateAccountBody } from "./schemas.mjs";

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
  fastify.post(
    "/",
    {
      schema: {
        body: CreateAccountBody,
        description:
          "Create an account as the tenant/customer ownership root. The authenticated caller becomes account owner, and account activation requirements decide whether the account starts active or pending activation.",
        operationId: "createAccount",
        response: {
          201: AccountResponse,
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
          kind: req.body.kind,
          name: req.body.name,
        }),
      );
    },
  );
}

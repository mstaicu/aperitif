import { createAccount } from "../../services/accounts/create.mjs";
import { listAccounts } from "../../services/accounts/list.mjs";
import { authenticateAccessToken } from "../../services/sessions/authenticate.mjs";
import { ProblemResponse } from "../problem-details.mjs";
import {
  AccountsResponse,
  CreateAccountBody,
  CreateAccountResponse,
} from "./accounts.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }>}
 */
export default async function accountsRoutes(fastify, { jwks, pool }) {
  fastify.post(
    "/accounts",
    {
      schema: {
        body: CreateAccountBody,
        description:
          "Creates an account and grants the authenticated caller its initial owner membership.",
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
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const principalId = await authenticateAccessToken({
        authorization: request.headers.authorization,
        jwks,
        pool,
      });

      return reply.code(201).send(
        await createAccount(
          { pool },
          {
            name: request.body.name,
            principalId,
          },
        ),
      );
    },
  );

  fastify.get(
    "/accounts",
    {
      schema: {
        description:
          "Lists accounts where the authenticated caller is a member.",
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
    async function (request, reply) {
      reply.header("Cache-Control", "no-store");

      const principalId = await authenticateAccessToken({
        authorization: request.headers.authorization,
        jwks,
        pool,
      });

      return reply.send(await listAccounts({ pool }, { principalId }));
    },
  );
}

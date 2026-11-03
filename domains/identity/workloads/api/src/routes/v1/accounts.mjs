import { createAccount } from "../../services/accounts/create.mjs";
import { listAccounts } from "../../services/accounts/list.mjs";
import { authenticateAccessToken } from "../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../errors.mjs";
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
          "4xx": ErrorResponse,
          201: CreateAccountResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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
          "4xx": ErrorResponse,
          200: AccountsResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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

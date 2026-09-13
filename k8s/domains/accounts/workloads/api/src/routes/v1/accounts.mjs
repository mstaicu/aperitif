import { authenticate } from "../../platform/authentication.mjs";
import { ProblemResponse } from "../../platform/problem-details.mjs";
import { createAccount } from "../../services/accounts/create.mjs";
import { listAccounts } from "../../services/accounts/list.mjs";
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
          "Create an account as the authority root for account-scoped access.",
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
        await createAccount(
          { pool },
          {
            currentUserId,
            name: req.body.name,
            type: req.body.type,
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

      return reply.send(await listAccounts({ pool }, { currentUserId }));
    },
  );
}

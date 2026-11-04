import { createAccount } from "../../../services/accounts/create.mjs";
import { listAccounts } from "../../../services/accounts/list.mjs";
import { authenticateAccessToken } from "../../../services/sessions/authenticate.mjs";
import { ErrorResponse } from "../../errors.mjs";
import {
  AccountsResponse,
  CreateAccountBody,
  CreateAccountResponse,
} from "./schemas.mjs";

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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          201: CreateAccountResponse,
          400: {
            ...ErrorResponse,
            description:
              "The account creation request is malformed. Correct the request body before resubmitting.",
          },
          401: {
            ...ErrorResponse,
            description:
              "Access token missing, invalid or expired. Call createAccessToken using a valid session; otherwise sign in.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
          500: {
            ...ErrorResponse,
            description:
              "The request failed; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable; the operation outcome may be unknown. Do not automatically repeat the mutation after a server error or timeout.",
          },
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
          "4xx": {
            ...ErrorResponse,
            description:
              "The request was rejected. Correct it before resubmitting.",
          },
          200: AccountsResponse,
          401: {
            ...ErrorResponse,
            description:
              "Access token missing, invalid or expired. Call createAccessToken using a valid session; otherwise sign in.",
            headers: {
              ...ErrorResponse.headers,
              "WWW-Authenticate": {
                enum: ["Bearer"],
                type: "string",
              },
            },
          },
          500: {
            ...ErrorResponse,
            description:
              "The request could not be completed. Try the read again later.",
          },
          503: {
            ...ErrorResponse,
            description:
              "The service is temporarily unavailable. Try the read again later.",
          },
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

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import createAccount from "./routes/accounts/accounts.create.mjs";
import listAccounts from "./routes/accounts/accounts.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/accounts/index.mjs").AccountsService} AccountsService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   accounts: AccountsService,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { jwks, services }) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            description:
              "Access token carried in the Authorization header as Bearer <token>.",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        description: "Accounts API for account lifecycle.",
        title: "Accounts",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account authority",
          name: "accounts",
        },
      ],
    },
  });

  await fastify.register(listAccounts, {
    accounts: services.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(createAccount, {
    accounts: services.accounts,
    jwks,
    prefix: "/accounts",
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/accounts/docs",
  });
};

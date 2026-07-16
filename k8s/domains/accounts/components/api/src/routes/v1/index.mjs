import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerCreateAccountRoute } from "./accounts/accounts.create.mjs";
import { registerListAccountsRoute } from "./accounts/accounts.list.mjs";

/**
 * @param {import("../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export const registerV1Routes = async (fastify, { accounts, jwks }) => {
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

  registerListAccountsRoute(fastify, {
    accounts,
    jwks,
  });
  registerCreateAccountRoute(fastify, {
    accounts,
    jwks,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/v1/accounts/docs",
  });
};

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import accountsRoutes from "./accounts.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }>}
 */
export default async function v1(fastify, { jwks, pool }) {
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

  fastify.register(accountsRoutes, { jwks, pool });

  await fastify.register(swaggerUI, {
    routePrefix: "/accounts/docs",
  });
}

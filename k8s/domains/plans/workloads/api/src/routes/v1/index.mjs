import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import plansRoutes from "./plans.mjs";

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
        description: "Plans API for assigning account plans.",
        title: "Plans",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account plans and their resolved features",
          name: "plans",
        },
      ],
    },
  });

  fastify.register(plansRoutes, { jwks, pool });

  await fastify.register(swaggerUI, {
    routePrefix: "/plans/docs",
  });
}

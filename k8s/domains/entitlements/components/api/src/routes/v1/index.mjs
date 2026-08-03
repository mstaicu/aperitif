import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerSetGrantRoute } from "./accounts/grants.set.mjs";

/**
 * @param {import("../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   grants: import("../../services/grants/index.mjs").GrantsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export const registerV1Routes = async (fastify, { grants, jwks }) => {
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
        description: "Entitlements API for account entitlement authority.",
        title: "Entitlements",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account capability grants",
          name: "grants",
        },
      ],
    },
  });

  registerSetGrantRoute(fastify, {
    grants,
    jwks,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/v1/entitlements/docs",
  });
};

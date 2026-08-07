import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerDeleteOverrideRoute } from "./accounts/override.delete.mjs";
import { registerSetOverrideRoute } from "./accounts/override.set.mjs";
import { registerSetPlanRoute } from "./accounts/plan.set.mjs";

/**
 * @param {import("../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   plans: import("../../services/plans/index.mjs").PlansService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export const registerV1Routes = async (fastify, { jwks, plans }) => {
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
        description: "Plans API for account plans and feature overrides.",
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

  registerSetPlanRoute(fastify, {
    jwks,
    plans,
  });
  registerSetOverrideRoute(fastify, {
    jwks,
    plans,
  });
  registerDeleteOverrideRoute(fastify, {
    jwks,
    plans,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/v1/plans/docs",
  });
};

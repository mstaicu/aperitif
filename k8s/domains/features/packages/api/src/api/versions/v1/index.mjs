import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import listFeatures from "./routes/features/features.list.mjs";
import addTenantFeatures from "./routes/features/grants/feature-grant.create.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/features/index.mjs").FeaturesService} FeaturesService
 * @typedef {import("../../../services/tenant-features/index.mjs").TenantFeaturesService} TenantFeaturesService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   features: FeaturesService,
 *   tenantFeatures: TenantFeaturesService,
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
        description: "Features API for tenant feature authority.",
        title: "Features",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Features and tenant feature commands",
          name: "features",
        },
      ],
    },
  });

  await fastify.register(addTenantFeatures, {
    jwks,
    prefix: "/features",
    tenantFeatures: services.tenantFeatures,
  });
  await fastify.register(listFeatures, {
    features: services.features,
    jwks,
    prefix: "/features",
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/features/docs",
  });
};

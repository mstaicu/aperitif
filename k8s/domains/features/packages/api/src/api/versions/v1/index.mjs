import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import createFeatureGrant from "./routes/admin/grants/feature-grant.create.mjs";
import createProductGrant from "./routes/admin/grants/product-grant.create.mjs";
import listProducts from "./routes/products/products.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/products/index.mjs").ProductsService} ProductsService
 * @typedef {import("../../../services/tenant-features/index.mjs").TenantFeaturesService} TenantFeaturesService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   products: ProductsService,
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
        description:
          "Features API for product catalogue and feature enablement.",
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
          description: "Products and the features they grant",
          name: "products",
        },
        {
          description: "Admin commands for tenant feature grants",
          name: "admin grants",
        },
      ],
    },
  });

  await fastify.register(createProductGrant, {
    jwks,
    prefix: "/admin/grants",
    tenantFeatures: services.tenantFeatures,
  });
  await fastify.register(createFeatureGrant, {
    jwks,
    prefix: "/admin/grants",
    tenantFeatures: services.tenantFeatures,
  });
  await fastify.register(listProducts, {
    jwks,
    prefix: "/products",
    products: services.products,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/features/docs",
  });
};

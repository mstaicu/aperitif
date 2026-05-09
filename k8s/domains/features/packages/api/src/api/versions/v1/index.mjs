import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import listProducts from "./routes/products/products.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/products/index.mjs").ProductsDomain} ProductsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   products: ProductsDomain,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { domains, jwks }) => {
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
          "Features API for product catalogue and tenant feature enablement.",
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
      ],
    },
  });

  await fastify.register(listProducts, {
    jwks,
    prefix: "/products",
    products: domains.products,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/features/docs",
  });
};

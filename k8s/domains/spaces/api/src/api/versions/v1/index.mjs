import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import admissionRoutes from "./routes/admissions/index.mjs";
import spaceRoutes from "./routes/spaces/index.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/admissions/index.mjs").AdmissionsDomain} AdmissionsDomain
 * @typedef {import("../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   admissions: AdmissionsDomain,
 *   spaces: SpacesDomain,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { domains, jwks }) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Spaces",
        version: "v1",
      },
      servers: [
        {
          url: "/spaces",
        },
      ],
      tags: [
        {
          description: "Space lifecycle and membership management",
          name: "spaces",
        },
        {
          description: "Admissions and requirement tracking",
          name: "admissions",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(spaceRoutes, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(admissionRoutes, {
    admissions: domains.admissions,
    jwks,
    prefix: "/admissions",
  });
};

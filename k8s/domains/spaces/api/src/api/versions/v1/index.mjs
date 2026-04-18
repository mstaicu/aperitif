import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import admissionRoutes from "./routes/admissions/index.mjs";
import spaceRoutes from "./routes/spaces/index.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../runtime/admissions/index.mjs").AdmissionsRuntime} AdmissionsRuntime
 * @typedef {import("../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{runtime: {
 *   admissions: AdmissionsRuntime,
 *   spaces: SpacesRuntime,
 * }}} opts
 */
export default async (fastify, { runtime }) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            scheme: "bearer",
            type: "http",
          },
        },
      },
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
    prefix: "/spaces",
    spaces: runtime.spaces,
  });
  await fastify.register(admissionRoutes, {
    admissions: runtime.admissions,
    prefix: "/admissions",
  });
};

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import listCapabilities from "./routes/capabilities/capabilities.list.mjs";
import addTenantCapabilities from "./routes/capabilities/grants/capability-grant.create.mjs";
import revokeTenantCapabilities from "./routes/capabilities/grants/capability-grant.revoke.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/capabilities/index.mjs").CapabilitiesService} CapabilitiesService
 * @typedef {import("../../../services/tenant-capabilities/index.mjs").TenantCapabilitiesService} TenantCapabilitiesService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   capabilities: CapabilitiesService,
 *   tenantCapabilities: TenantCapabilitiesService,
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
        description: "Capabilities API for tenant capability authority.",
        title: "Capabilities",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Capabilities and tenant capability commands",
          name: "capabilities",
        },
      ],
    },
  });

  await fastify.register(addTenantCapabilities, {
    jwks,
    prefix: "/capabilities",
    tenantCapabilities: services.tenantCapabilities,
  });
  await fastify.register(revokeTenantCapabilities, {
    jwks,
    prefix: "/capabilities",
    tenantCapabilities: services.tenantCapabilities,
  });
  await fastify.register(listCapabilities, {
    capabilities: services.capabilities,
    jwks,
    prefix: "/capabilities",
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/capabilities/docs",
  });
};

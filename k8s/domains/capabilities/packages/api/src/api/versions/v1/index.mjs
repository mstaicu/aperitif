import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import listCapabilities from "./routes/capabilities/capabilities.list.mjs";
import addAccountCapabilities from "./routes/capabilities/grants/capability-grant.create.mjs";
import revokeAccountCapabilities from "./routes/capabilities/grants/capability-grant.revoke.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/capabilities/index.mjs").CapabilitiesService} CapabilitiesService
 * @typedef {import("../../../services/account-capabilities/index.mjs").AccountCapabilitiesService} AccountCapabilitiesService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   capabilities: CapabilitiesService,
 *   accountCapabilities: AccountCapabilitiesService,
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
        description: "Capabilities API for account capability authority.",
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
          description: "Capabilities and account capability commands",
          name: "capabilities",
        },
      ],
    },
  });

  await fastify.register(addAccountCapabilities, {
    accountCapabilities: services.accountCapabilities,
    jwks,
    prefix: "/capabilities",
  });
  await fastify.register(revokeAccountCapabilities, {
    accountCapabilities: services.accountCapabilities,
    jwks,
    prefix: "/capabilities",
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

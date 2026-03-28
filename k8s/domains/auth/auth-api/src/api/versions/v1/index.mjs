import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import passkeyRoutes from "./routes/passkeys/index.mjs";
import sessionRoutes from "./routes/sessions/index.mjs";

/**
 * @param {import('../../../fastify.js').FastifyInstance} fastify
 * @param {import("../../../fastify.js").WithRuntime} opts
 */
export default async (fastify, opts) => {
  const { runtime } = opts;

  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        title: "Authentication",
        version: "v1",
      },
      servers: [
        {
          url: "/auth",
        },
      ],
      tags: [
        {
          description: "Passkey registration and authentication flows",
          name: "passkeys",
        },
        {
          description: "Session lifecycle and token refresh",
          name: "sessions",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(passkeyRoutes, {
    prefix: "/passkeys",
    runtime,
  });
  await fastify.register(sessionRoutes, {
    prefix: "/sessions",
    runtime,
  });
};

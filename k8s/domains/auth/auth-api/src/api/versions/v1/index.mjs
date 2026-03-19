import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import nconf from "nconf";

import passkeyRoutes from "./routes/passkeys/index.mjs";
import sessionRoutes from "./routes/sessions/index.mjs";

const { origin } = new URL(nconf.get("ORIGIN"));

/**
 * @param {import('../../../fastify.js').FastifyInstance} fastify
 */
export default async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Authentication",
        version: "v1",
      },
      servers: [
        {
          url: `${origin}/auth`,
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
  });
  await fastify.register(sessionRoutes, {
    prefix: "/sessions",
  });
};

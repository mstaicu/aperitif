import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import passkeyRoutes from "./routes/passkeys/index.mjs";
import sessionRoutes from "./routes/sessions/index.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../runtime/passkeys/index.mjs").PasskeysRuntime} PasskeysRuntime
 * @typedef {import("../../../runtime/sessions/index.mjs").SessionsRuntime} SessionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{runtime: {
 *   passkeys: PasskeysRuntime,
 *   sessions: SessionsRuntime,
 * }}} opts
 */
export default async (fastify, { runtime }) => {
  await fastify.register(swagger, {
    openapi: {
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
    passkeys: runtime.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(sessionRoutes, {
    sessions: runtime.sessions,
    prefix: "/sessions",
  });
};

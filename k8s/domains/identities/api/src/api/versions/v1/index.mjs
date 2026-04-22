import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import passkeyRoutes from "./routes/passkeys/index.mjs";
import sessionRoutes from "./routes/sessions/index.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../domains/passkeys/index.mjs").PasskeysDomain} PasskeysDomain
 * @typedef {import("../../../domains/sessions/index.mjs").SessionsDomain} SessionsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   passkeys: PasskeysDomain,
 *   sessions: SessionsDomain,
 * }}} opts
 */
export default async (fastify, { domains }) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          refreshTokenAuth: {
            bearerFormat: "RefreshToken",
            description:
              "Refresh token carried in the Authorization header as Bearer <token>.",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        description:
          "Identity API for passkey registration, passkey authentication, and session token lifecycle management.",
        title: "Identities",
        version: "v1",
      },
      servers: [
        {
          url: "/identities",
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
    passkeys: domains.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(sessionRoutes, {
    prefix: "/sessions",
    sessions: domains.sessions,
  });
};

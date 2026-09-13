import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import passkeysRoutes from "./passkeys.mjs";
import sessionsRoutes from "./sessions.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   origin: string,
 *   signingKey: import("../../platform/jwt-keys.mjs").JwtKeys["signingKey"],
 * }>}
 */
export default async function v1(fastify, { origin, pool, signingKey }) {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          sessionTokenAuth: {
            bearerFormat: "SessionToken",
            description:
              "Session token carried in the Authorization header as Bearer <token>.",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        description:
          "Auth API for passkey registration, passkey authentication, and session token lifecycle management.",
        title: "Auth",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Passkey registration and authentication",
          name: "passkeys",
        },
        {
          description: "Session and access-token lifecycle",
          name: "sessions",
        },
      ],
    },
  });

  fastify.register(passkeysRoutes, { origin, pool });
  fastify.register(sessionsRoutes, { pool, signingKey });

  await fastify.register(swaggerUI, {
    routePrefix: "/auth/docs",
  });
}

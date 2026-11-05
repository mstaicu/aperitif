import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import accountsRoutes from "./accounts/routes.mjs";
import passkeyAdditionRoutes from "./passkeys/addition.mjs";
import passkeyAuthenticationRoutes from "./passkeys/authentication.mjs";
import passkeyManagementRoutes from "./passkeys/management.mjs";
import passkeyRegistrationRoutes from "./passkeys/registration.mjs";
import sessionsRoutes from "./sessions/routes.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   origin: string,
 *   signingKey: import("../../jwks.mjs").JwtKeys["signingKey"],
 * }>}
 */
export default async function v1(fastify, { jwks, origin, pool, signingKey }) {
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
        description: `Identity API for passkeys, sessions, accounts, and account memberships.

Errors use application/json with required statusCode, error, and message fields. React to the HTTP status and endpoint; messages are human-readable and must not be parsed as identifiers. Treat unrecognized statuses and non-JSON failures as generic failures.

400 means malformed input; correct it before requesting fresh options. 401 requires a valid live session or access token, as specified by the operation's security scheme. 422 means the WebAuthn proof or attempt was rejected; causes are intentionally indistinguishable. Proofs are single-use, including after failed verification: request fresh options and repeat the ceremonies. Options and read requests may be repeated. A mutation's outcome may be unknown after a timeout, 500, or 503; do not automatically replay it. Follow the operation's recovery instructions.`,
        title: "Identity",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account and membership authority",
          name: "accounts",
        },
        {
          description:
            "Passkey registration, authentication, addition, and removal",
          name: "passkeys",
        },
        {
          description: "Session and access-token lifecycle",
          name: "sessions",
        },
      ],
    },
  });

  fastify.register(accountsRoutes, { jwks, pool });
  fastify.register(passkeyManagementRoutes, { jwks, origin, pool });
  fastify.register(passkeyAuthenticationRoutes, { origin, pool });
  fastify.register(passkeyRegistrationRoutes, { origin, pool });
  fastify.register(passkeyAdditionRoutes, { jwks, origin, pool });
  fastify.register(sessionsRoutes, { pool, signingKey });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/identity/docs",
  });
}

import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import accountsRoutes from "./accounts.mjs";
import passkeyManagementRoutes from "./passkey-management.mjs";
import passkeysRoutes from "./passkeys.mjs";
import sessionsRoutes from "./sessions.mjs";

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

| Status | Consumer reaction |
| --- | --- |
| 400 | Correct the request before resubmitting. |
| 401 | Supply the bearer credential required by this endpoint. Renew an access token using a valid session, or sign in again. |
| 404 | The requested resource is unavailable to the caller; refresh local state. |
| 409 | Removing the final authentication method is blocked; add another passkey first. |
| 422 | The passkey operation could not be completed. Obtain fresh options and proof. Signup may require signing in with an existing passkey instead. Failure causes are not distinguished. |
| 500, 503 | The operation failed. Do not automatically repeat mutations; their outcome may be unknown. |

Correct malformed requests before resubmitting. After a failed ceremony submission, obtain fresh options and proofs. Do not automatically repeat mutations after a server error or timeout: their outcome may be unknown.`,
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
            "Passkey signup, authentication, and credential management",
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
  fastify.register(passkeysRoutes, { jwks, origin, pool });
  fastify.register(sessionsRoutes, { pool, signingKey });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/identity/docs",
  });
}

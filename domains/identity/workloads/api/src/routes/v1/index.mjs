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

Errors use application/problem+json with type, title, and status. Match type for a specific reaction; title is human-readable. Unknown types, additional fields, and non-JSON failures must have a generic fallback.

| Problem type | Status | Consumer reaction |
| --- | --- | --- |
| /problems/invalid-access-token | 401 | Obtain a new access token with a valid session; sign in if the session is invalid. |
| /problems/invalid-session-token | 401 | Sign in again. |
| /problems/invalid-authorization-header | 401 | Supply the bearer credential required by the endpoint. |
| /problems/authentication-failed, /problems/registration-verification-failed | 422 | Obtain fresh ceremony options and proof. This does not invalidate an existing session. |
| /problems/last-authentication-method | 409 | Add another passkey before removing this one. |
| /problems/credential-already-exists, /problems/user-already-registered | 409 | Sign in with the existing passkey; use authenticated registration to add another. |

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

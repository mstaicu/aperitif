import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerOperatorRoutes } from "./operators/operator.mjs";
import { registerLoginChallengeRoute } from "./passkeys/login.challenge.mjs";
import { registerLoginRoute } from "./passkeys/login.mjs";
import { registerRegistrationChallengeRoute } from "./passkeys/register.challenge.mjs";
import { registerRegistrationRoute } from "./passkeys/register.mjs";
import { registerAccessTokenRoute } from "./sessions/access-token.create.mjs";
import { registerRevokeSessionRoute } from "./sessions/session.revoke.mjs";

/**
 * @param {import("../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   jwks: import("../../platform/security/index.mjs").JwtKeys["jwks"],
 *   operators: import("../../services/operators/index.mjs").OperatorsService,
 *   passkeys: import("../../services/passkeys/index.mjs").PasskeysService,
 *   prefix: string,
 *   sessions: import("../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export const registerV1Routes = async (
  fastify,
  { jwks, operators, passkeys, prefix, sessions },
) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            scheme: "bearer",
            type: "http",
          },
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
          description: "Platform operator assignment",
          name: "operators",
        },
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

  registerLoginChallengeRoute(fastify, {
    passkeys,
    prefix: `${prefix}/passkeys`,
  });
  registerLoginRoute(fastify, {
    passkeys,
    prefix: `${prefix}/passkeys`,
  });
  registerRegistrationChallengeRoute(fastify, {
    passkeys,
    prefix: `${prefix}/passkeys`,
  });
  registerRegistrationRoute(fastify, {
    passkeys,
    prefix: `${prefix}/passkeys`,
  });
  registerOperatorRoutes(fastify, {
    jwks,
    operators,
    prefix: `${prefix}/operators`,
  });
  registerAccessTokenRoute(fastify, {
    prefix: `${prefix}/sessions`,
    sessions,
  });
  registerRevokeSessionRoute(fastify, {
    prefix: `${prefix}/sessions`,
    sessions,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: prefix,
    routePrefix: `${prefix}/identity/docs`,
  });
};

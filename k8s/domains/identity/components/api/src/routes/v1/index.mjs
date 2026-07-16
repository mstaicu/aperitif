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
 *   sessions: import("../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export const registerV1Routes = async (
  fastify,
  { jwks, operators, passkeys, sessions },
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
  });
  registerLoginRoute(fastify, {
    passkeys,
  });
  registerRegistrationChallengeRoute(fastify, {
    passkeys,
  });
  registerRegistrationRoute(fastify, {
    passkeys,
  });
  registerOperatorRoutes(fastify, {
    jwks,
    operators,
  });
  registerAccessTokenRoute(fastify, {
    sessions,
  });
  registerRevokeSessionRoute(fastify, {
    sessions,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/v1/identity/docs",
  });
};

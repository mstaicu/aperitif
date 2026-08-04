import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerLoginChallengeRoute } from "./passkeys/login.challenge.mjs";
import { registerLoginRoute } from "./passkeys/login.mjs";
import { registerRegistrationChallengeRoute } from "./passkeys/register.challenge.mjs";
import { registerRegistrationRoute } from "./passkeys/register.mjs";
import { registerAccessTokenRoute } from "./sessions/access-token.create.mjs";
import { registerRevokeSessionRoute } from "./sessions/session.revoke.mjs";

/**
 * @param {import("../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   passkeys: import("../../services/passkeys/index.mjs").PasskeysService,
 *   sessions: import("../../services/sessions/index.mjs").SessionsService,
 * }} opts
 */
export const registerV1Routes = async (fastify, { passkeys, sessions }) => {
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

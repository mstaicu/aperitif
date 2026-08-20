import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerAuthenticationRoute } from "./passkeys/authentication.mjs";
import { registerAuthenticationOptionsRoute } from "./passkeys/authentication.options.mjs";
import { registerRegistrationRoute } from "./passkeys/registration.mjs";
import { registerRegistrationOptionsRoute } from "./passkeys/registration.options.mjs";
import { registerAccessTokenRoute } from "./session/access-tokens.create.mjs";
import { registerRevokeSessionRoute } from "./session/session.delete.mjs";

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

  registerAuthenticationOptionsRoute(fastify, {
    passkeys,
  });
  registerAuthenticationRoute(fastify, {
    passkeys,
  });
  registerRegistrationOptionsRoute(fastify, {
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
    routePrefix: "/v1/auth/docs",
  });
};

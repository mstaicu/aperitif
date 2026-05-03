import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import loginChallenge from "./routes/passkeys/login.challenge.mjs";
import login from "./routes/passkeys/login.mjs";
import registerChallenge from "./routes/passkeys/register.challenge.mjs";
import register from "./routes/passkeys/register.mjs";
import accessToken from "./routes/sessions/access-token.mjs";
import refreshToken from "./routes/sessions/refresh-token.mjs";

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
          description: "Passkey registration and authentication flows",
          name: "passkeys",
        },
        {
          description: "Session access-token and refresh-token lifecycle",
          name: "sessions",
        },
      ],
    },
  });

  await fastify.register(loginChallenge, {
    passkeys: domains.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(login, {
    passkeys: domains.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(registerChallenge, {
    passkeys: domains.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(register, {
    passkeys: domains.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(accessToken, {
    prefix: "/sessions",
    sessions: domains.sessions,
  });
  await fastify.register(refreshToken, {
    prefix: "/sessions",
    sessions: domains.sessions,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/identity/docs",
  });
};

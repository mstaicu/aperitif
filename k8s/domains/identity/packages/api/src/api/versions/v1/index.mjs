import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import operator from "./routes/operators/operator.mjs";
import loginChallenge from "./routes/passkeys/login.challenge.mjs";
import login from "./routes/passkeys/login.mjs";
import passkeyChallenge from "./routes/passkeys/passkey.challenge.mjs";
import passkeyCreate from "./routes/passkeys/passkey.create.mjs";
import registerChallenge from "./routes/passkeys/register.challenge.mjs";
import register from "./routes/passkeys/register.mjs";
import accessToken from "./routes/sessions/access-token.create.mjs";
import refreshToken from "./routes/sessions/refresh-token.rotate.mjs";
import deleteSession from "./routes/sessions/session.revoke.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../services/operators/index.mjs").OperatorsService} OperatorsService
 * @typedef {import("../../../services/passkeys/index.mjs").PasskeysService} PasskeysService
 * @typedef {import("../../../services/sessions/index.mjs").SessionsService} SessionsService
 * @typedef {import("../../../platform/security/index.mjs").JwtKeys["jwks"]} JsonWebKeySet
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   operators: OperatorsService,
 *   passkeys: PasskeysService,
 *   sessions: SessionsService,
 * }, jwks: JsonWebKeySet}} opts
 */
export default async (fastify, { jwks, services }) => {
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
          description:
            "Passkey registration, authentication, and credential management",
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
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(login, {
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(passkeyChallenge, {
    jwks,
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(passkeyCreate, {
    jwks,
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(registerChallenge, {
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(register, {
    passkeys: services.passkeys,
    prefix: "/passkeys",
  });
  await fastify.register(operator, {
    jwks,
    operators: services.operators,
    prefix: "/operators",
  });
  await fastify.register(accessToken, {
    prefix: "/sessions",
    sessions: services.sessions,
  });
  await fastify.register(refreshToken, {
    prefix: "/sessions",
    sessions: services.sessions,
  });
  await fastify.register(deleteSession, {
    prefix: "/sessions",
    sessions: services.sessions,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/identity/docs",
  });
};

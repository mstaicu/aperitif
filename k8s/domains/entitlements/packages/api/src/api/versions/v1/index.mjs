import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import listEntitlements from "./routes/entitlements/entitlements.list.mjs";
import addAccountEntitlements from "./routes/entitlements/grants/entitlement-grant.create.mjs";
import revokeAccountEntitlements from "./routes/entitlements/grants/entitlement-grant.revoke.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/entitlements/index.mjs").EntitlementsService} EntitlementsService
 * @typedef {import("../../../services/account-entitlements/index.mjs").AccountEntitlementsService} AccountEntitlementsService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   entitlements: EntitlementsService,
 *   accountEntitlements: AccountEntitlementsService,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { jwks, services }) => {
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
        },
      },
      info: {
        description: "Entitlements API for account entitlement authority.",
        title: "Entitlements",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Entitlements and account entitlement commands",
          name: "entitlements",
        },
      ],
    },
  });

  await fastify.register(addAccountEntitlements, {
    accountEntitlements: services.accountEntitlements,
    jwks,
    prefix: "/entitlements",
  });
  await fastify.register(revokeAccountEntitlements, {
    accountEntitlements: services.accountEntitlements,
    jwks,
    prefix: "/entitlements",
  });
  await fastify.register(listEntitlements, {
    entitlements: services.entitlements,
    jwks,
    prefix: "/entitlements",
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/entitlements/docs",
  });
};

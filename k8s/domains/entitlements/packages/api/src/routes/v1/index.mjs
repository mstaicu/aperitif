import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerListEntitlementsRoute } from "./entitlements/entitlements.list.mjs";
import { registerAddAccountEntitlementsRoute } from "./entitlements/grants/entitlement-grant.create.mjs";
import { registerRevokeAccountEntitlementsRoute } from "./entitlements/grants/entitlement-grant.revoke.mjs";

/**
 * @param {import("../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   accountEntitlements: import("../../services/account-entitlements/index.mjs").AccountEntitlementsService,
 *   entitlements: import("../../services/entitlements/index.mjs").EntitlementsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export const registerV1Routes = async (
  fastify,
  { accountEntitlements, entitlements, jwks, prefix },
) => {
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

  registerAddAccountEntitlementsRoute(fastify, {
    accountEntitlements,
    jwks,
    prefix: `${prefix}/entitlements`,
  });
  registerRevokeAccountEntitlementsRoute(fastify, {
    accountEntitlements,
    jwks,
    prefix: `${prefix}/entitlements`,
  });
  registerListEntitlementsRoute(fastify, {
    entitlements,
    jwks,
    prefix: `${prefix}/entitlements`,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: prefix,
    routePrefix: `${prefix}/entitlements/docs`,
  });
};

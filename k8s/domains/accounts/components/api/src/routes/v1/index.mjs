import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerCreateAccountRoute } from "./accounts/accounts.create.mjs";
import { registerListAccountsRoute } from "./accounts/accounts.list.mjs";
import { registerCreateMemberRoute } from "./accounts/members.create.mjs";
import { registerDeleteMemberRoute } from "./accounts/members.delete.mjs";
import { registerListMembersRoute } from "./accounts/members.list.mjs";
import { registerUpdateMemberRoute } from "./accounts/members.update.mjs";

/**
 * @param {import("../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   accounts: import("../../services/accounts/index.mjs").AccountsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export const registerV1Routes = async (fastify, { accounts, jwks }) => {
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
        description: "Accounts API for account lifecycle.",
        title: "Accounts",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account authority",
          name: "accounts",
        },
        {
          description: "Generic account membership",
          name: "members",
        },
      ],
    },
  });

  registerListAccountsRoute(fastify, {
    accounts,
    jwks,
  });
  registerCreateAccountRoute(fastify, {
    accounts,
    jwks,
  });
  registerListMembersRoute(fastify, {
    accounts,
    jwks,
  });
  registerCreateMemberRoute(fastify, {
    accounts,
    jwks,
  });
  registerUpdateMemberRoute(fastify, {
    accounts,
    jwks,
  });
  registerDeleteMemberRoute(fastify, {
    accounts,
    jwks,
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/v1/accounts/docs",
  });
};

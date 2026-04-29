import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import getAccount from "./routes/accounts/account.get.mjs";
import deleteAccountMembership from "./routes/accounts/account.membership.delete.mjs";
import createAccountMembership from "./routes/accounts/account.memberships.create.mjs";
import listAccountMemberships from "./routes/accounts/account.memberships.list.mjs";
import completeAccountRequirement from "./routes/accounts/account.requirement.complete.mjs";
import listAccountRequirements from "./routes/accounts/account.requirements.list.mjs";
import createAccount from "./routes/accounts/accounts.create.mjs";
import listAccounts from "./routes/accounts/accounts.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/accounts/index.mjs").AccountsDomain} AccountsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   accounts: AccountsDomain,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { domains, jwks }) => {
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
        description:
          "Authority API for account ownership, memberships, and activation requirements.",
        title: "Accounts",
        version: "v1",
      },
      servers: [
        {
          url: "/accounts",
        },
      ],
      tags: [
        {
          description: "Tenant/customer ownership and account membership",
          name: "accounts",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(listAccounts, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(createAccount, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(getAccount, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(listAccountMemberships, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(createAccountMembership, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(deleteAccountMembership, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(listAccountRequirements, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
  await fastify.register(completeAccountRequirement, {
    accounts: domains.accounts,
    jwks,
    prefix: "/accounts",
  });
};

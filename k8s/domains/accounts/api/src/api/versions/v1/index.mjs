import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import getAccount from "./routes/accounts/account.get.mjs";
import deleteAccountMembership from "./routes/accounts/account.membership.delete.mjs";
import getAccountMembership from "./routes/accounts/account.membership.get.mjs";
import listAccountMemberships from "./routes/accounts/account.memberships.list.mjs";
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
          "Accounts API for account ownership, memberships, and activation requirements.",
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
          description: "Account authority and account membership",
          name: "accounts",
        },
      ],
    },
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
  await fastify.register(getAccountMembership, {
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

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/accounts/docs",
  });
};

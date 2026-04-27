import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import getAccount from "./routes/accounts/account.get.mjs";
import deleteAccountMembership from "./routes/accounts/account.membership.delete.mjs";
import createAccountMembership from "./routes/accounts/account.memberships.create.mjs";
import listAccountMemberships from "./routes/accounts/account.memberships.list.mjs";
import completeAccountRequirement from "./routes/accounts/account.requirement.complete.mjs";
import listAccountRequirements from "./routes/accounts/account.requirements.list.mjs";
import createAccountSpace from "./routes/accounts/account.spaces.create.mjs";
import listAccountSpaces from "./routes/accounts/account.spaces.list.mjs";
import createAccount from "./routes/accounts/accounts.create.mjs";
import listAccounts from "./routes/accounts/accounts.list.mjs";
import claimAdmission from "./routes/admissions/admission.claim.mjs";
import getAdmission from "./routes/admissions/admission.get.mjs";
import completeAdmissionRequirement from "./routes/admissions/admission.requirement.complete.mjs";
import createSpaceAdmission from "./routes/spaces/space.admissions.create.mjs";
import listSpaceAdmissions from "./routes/spaces/space.admissions.list.mjs";
import destroySpace from "./routes/spaces/space.delete.mjs";
import getSpace from "./routes/spaces/space.get.mjs";
import deleteSpaceMembership from "./routes/spaces/space.membership.delete.mjs";
import listSpaceMemberships from "./routes/spaces/space.memberships.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   spaces: SpacesDomain,
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
          "Authority API for account ownership, optional space contexts, memberships, and admissions.",
        title: "Spaces",
        version: "v1",
      },
      servers: [
        {
          url: "/spaces",
        },
      ],
      tags: [
        {
          description: "Tenant/customer ownership and account membership",
          name: "accounts",
        },
        {
          description:
            "Optional sub-authority contexts under accounts, with explicit membership management",
          name: "spaces",
        },
        {
          description: "Admissions and requirement tracking",
          name: "admissions",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(listAccounts, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(createAccount, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(getAccount, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(listAccountMemberships, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(createAccountMembership, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(deleteAccountMembership, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(listAccountRequirements, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(completeAccountRequirement, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(listAccountSpaces, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(createAccountSpace, {
    jwks,
    prefix: "/accounts",
    spaces: domains.spaces,
  });
  await fastify.register(getSpace, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(destroySpace, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(createSpaceAdmission, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(listSpaceAdmissions, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(listSpaceMemberships, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(deleteSpaceMembership, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(getAdmission, {
    jwks,
    prefix: "/admissions",
    spaces: domains.spaces,
  });
  await fastify.register(completeAdmissionRequirement, {
    jwks,
    prefix: "/admissions",
    spaces: domains.spaces,
  });
  await fastify.register(claimAdmission, {
    jwks,
    prefix: "/admissions",
    spaces: domains.spaces,
  });
};

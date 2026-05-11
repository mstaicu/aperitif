import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import getTenant from "./routes/tenants/tenant.get.mjs";
import deleteTenantMembership from "./routes/tenants/tenant.membership.delete.mjs";
import getTenantMembership from "./routes/tenants/tenant.membership.get.mjs";
import listTenantMemberships from "./routes/tenants/tenant.memberships.list.mjs";
import createTenantWorkspace from "./routes/tenants/tenant.workspace.create.mjs";
import listTenantWorkspaces from "./routes/tenants/tenant.workspaces.list.mjs";
import createTenant from "./routes/tenants/tenants.create.mjs";
import listTenants from "./routes/tenants/tenants.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/tenants/index.mjs").TenancyDomain} TenancyDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   tenancy: TenancyDomain,
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
          "Tenancy API for tenants, tenant memberships, and workspaces.",
        title: "Tenancy",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Tenant authority, tenant membership, and workspaces",
          name: "tenants",
        },
      ],
    },
  });

  await fastify.register(listTenants, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(createTenant, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(getTenant, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(listTenantMemberships, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(getTenantMembership, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(deleteTenantMembership, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(createTenantWorkspace, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });
  await fastify.register(listTenantWorkspaces, {
    jwks,
    prefix: "/tenants",
    tenancy: domains.tenancy,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/tenancy/docs",
  });
};

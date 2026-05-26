import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import assignTenantMemberRole from "./routes/tenants/members/tenant-member-role.assign.mjs";
import tenantMember from "./routes/tenants/members/tenant-member.mjs";
import createTenant from "./routes/tenants/tenants.create.mjs";
import listTenants from "./routes/tenants/tenants.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/tenant-roles/index.mjs").TenantRolesService} TenantRolesService
 * @typedef {import("../../../services/tenants/index.mjs").TenancyService} TenancyService
 */

/**
 * @param {Fastify} fastify
 * @param {{services: {
 *   tenantRoles: TenantRolesService,
 *   tenancy: TenancyService,
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
        description: "Tenancy API for tenants and tenant memberships.",
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
          description: "Tenant authority",
          name: "tenants",
        },
      ],
    },
  });

  await fastify.register(listTenants, {
    jwks,
    prefix: "/tenants",
    tenancy: services.tenancy,
  });
  await fastify.register(createTenant, {
    jwks,
    prefix: "/tenants",
    tenancy: services.tenancy,
  });
  await fastify.register(tenantMember, {
    jwks,
    prefix: "/tenants/:tenant_id/members/:user_id",
    tenancy: services.tenancy,
  });
  await fastify.register(assignTenantMemberRole, {
    jwks,
    prefix: "/tenants/:tenant_id/members/:user_id/role",
    tenantRoles: services.tenantRoles,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/tenants/docs",
  });
};

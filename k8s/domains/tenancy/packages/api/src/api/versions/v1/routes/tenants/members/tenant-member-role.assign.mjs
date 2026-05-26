import { verifyAccessToken } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  AssignTenantMemberRoleBody,
  AssignTenantMemberRoleResponse,
  TenantMemberParams,
} from "../schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/tenant-roles/index.mjs").TenantRolesService} TenantRolesService
 */

/**
 * @param {Fastify} fastify
 * @param {{tenantRoles: TenantRolesService, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenantRoles }) {
  fastify.put(
    "",
    {
      schema: {
        body: AssignTenantMemberRoleBody,
        description: "Assign a role to a tenant member.",
        operationId: "assignTenantMemberRole",
        params: TenantMemberParams,
        response: {
          200: AssignTenantMemberRoleResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Assign tenant member role",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const payload = await verifyAccessToken({
        authorization: req.headers.authorization,
        jwks,
      });
      const isPlatformOperator =
        Array.isArray(payload.platform_roles) &&
        payload.platform_roles.includes("operator");

      return reply.send(
        await tenantRoles.assignTenantMemberRole({
          currentUserId: payload.sub,
          isPlatformOperator,
          roleId: req.body.role_id,
          tenantId: req.params.tenant_id,
          userId: req.params.user_id,
        }),
      );
    },
  );
}

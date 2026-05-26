import { verifyAccessToken } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import { TenantMemberParams, TenantMemberResponse } from "../schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/tenants/index.mjs").TenancyService} TenancyService
 */

/**
 * @param {Fastify} fastify
 * @param {{tenancy: TenancyService, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenancy }) {
  fastify.put(
    "",
    {
      schema: {
        description: "Add a user as a tenant member.",
        operationId: "addTenantMember",
        params: TenantMemberParams,
        response: {
          200: TenantMemberResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Add tenant member",
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
        await tenancy.addTenantMember({
          currentUserId: payload.sub,
          isPlatformOperator,
          tenantId: req.params.tenant_id,
          userId: req.params.user_id,
        }),
      );
    },
  );

  fastify.delete(
    "",
    {
      schema: {
        description: "Remove a user from a tenant.",
        operationId: "removeTenantMember",
        params: TenantMemberParams,
        response: {
          200: TenantMemberResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Remove tenant member",
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
        await tenancy.removeTenantMember({
          currentUserId: payload.sub,
          isPlatformOperator,
          tenantId: req.params.tenant_id,
          userId: req.params.user_id,
        }),
      );
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { TenantParams, TenantWorkspacesResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/tenants/index.mjs").TenancyService} TenancyService
 */

/**
 * @param {Fastify} fastify
 * @param {{tenancy: TenancyService, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenancy }) {
  fastify.get(
    "/:tenantId/workspaces",
    {
      schema: {
        description:
          "List workspaces inside a tenant. Tenant members can access tenant workspaces.",
        operationId: "listTenantWorkspaces",
        params: TenantParams,
        response: {
          200: TenantWorkspacesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List tenant workspaces",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenancy.listTenantWorkspaces({
          currentUserId,
          tenantId: req.params.tenantId,
        }),
      );
    },
  );
}

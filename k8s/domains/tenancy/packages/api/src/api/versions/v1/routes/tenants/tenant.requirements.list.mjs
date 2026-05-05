import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { TenantParams, TenantRequirementsResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/tenants/index.mjs").TenancyDomain} TenancyDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{tenancy: TenancyDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenancy }) {
  fastify.get(
    "/:tenantId/requirements",
    {
      schema: {
        description:
          "List tenant activation requirements. Tenant members can inspect the gates that block tenant activation.",
        operationId: "listTenantRequirements",
        params: TenantParams,
        response: {
          200: TenantRequirementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List tenant requirements",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenancy.listTenantRequirements({
          currentUserId,
          tenantId: req.params.tenantId,
        }),
      );
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  TenantMembershipParams,
  TenantMembershipResponse,
} from "./schemas.mjs";

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
    "/:tenantId/memberships/:userId",
    {
      schema: {
        description:
          "Fetch a specific tenant membership. Owners can inspect any membership; non-owners can inspect only their own membership by using their identity user id.",
        operationId: "getTenantMembership",
        params: TenantMembershipParams,
        response: {
          200: TenantMembershipResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get tenant membership",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenancy.getTenantMembership({
          currentUserId,
          tenantId: req.params.tenantId,
          userId: req.params.userId,
        }),
      );
    },
  );
}

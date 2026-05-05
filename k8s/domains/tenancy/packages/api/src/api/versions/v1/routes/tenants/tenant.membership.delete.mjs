import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { EmptyResponse, ProblemResponse } from "../../../../shared/schemas.mjs";
import { TenantMembershipParams } from "./schemas.mjs";

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
  fastify.delete(
    "/:tenantId/memberships/:userId",
    {
      schema: {
        description:
          "Remove tenant-level authority. Owners cannot self-target through this endpoint, and removing an already-absent membership is a no-op.",
        operationId: "deleteTenantMembership",
        params: TenantMembershipParams,
        response: {
          204: EmptyResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Delete tenant membership",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      await tenancy.deleteTenantMembership({
        currentUserId,
        tenantId: req.params.tenantId,
        userId: req.params.userId,
      });

      return reply.code(204).send(null);
    },
  );
}

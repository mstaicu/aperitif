import { authenticatePlatformOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  RevokeTenantCapabilitiesBody,
  RevokeTenantCapabilitiesResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/tenant-capabilities/index.mjs").TenantCapabilitiesService} TenantCapabilitiesService
 */

/**
 * @param {Fastify} fastify
 * @param {{tenantCapabilities: TenantCapabilitiesService, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenantCapabilities }) {
  fastify.delete(
    "",
    {
      schema: {
        body: RevokeTenantCapabilitiesBody,
        description:
          "Platform operator command that revokes current tenant capability grants and recomputes effective tenant capabilities.",
        operationId: "revokeTenantCapabilities",
        response: {
          200: RevokeTenantCapabilitiesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Revoke tenant capability grants",
        tags: ["capabilities"],
      },
    },
    async function (req, reply) {
      await authenticatePlatformOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenantCapabilities.revokeTenantCapabilities({
          capabilities: req.body.capabilities,
          tenantId: req.body.tenant_id,
        }),
      );
    },
  );
}

import { authenticatePlatformOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  AddTenantFeaturesBody,
  AddTenantFeaturesResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/tenant-features/index.mjs").TenantFeaturesService} TenantFeaturesService
 */

/**
 * @param {Fastify} fastify
 * @param {{tenantFeatures: TenantFeaturesService, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenantFeatures }) {
  fastify.post(
    "",
    {
      schema: {
        body: AddTenantFeaturesBody,
        description:
          "Platform operator command that adds current tenant feature grants and recomputes effective tenant features.",
        operationId: "addTenantFeatures",
        response: {
          200: AddTenantFeaturesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Add tenant feature grants",
        tags: ["features"],
      },
    },
    async function (req, reply) {
      await authenticatePlatformOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenantFeatures.addTenantFeatures({
          features: req.body.features,
          tenantId: req.body.tenant_id,
        }),
      );
    },
  );
}

import { authenticatePlatformOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../shared/schemas.mjs";
import { CreateFeatureGrantBody, GrantResponse } from "./schemas.mjs";

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
        body: CreateFeatureGrantBody,
        description:
          "Platform operator command that grants one feature to a tenant and recomputes tenant features.",
        operationId: "createFeatureGrant",
        response: {
          200: GrantResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Grant tenant feature",
        tags: ["feature grants"],
      },
    },
    async function (req, reply) {
      await authenticatePlatformOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenantFeatures.createTenantFeatureGrant({
          featureCode: req.body.feature_code,
          grantRef: req.body.grant_ref,
          tenantId: req.body.tenant_id,
          value: req.body.value,
        }),
      );
    },
  );
}

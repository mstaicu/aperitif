import { authenticate } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../shared/schemas.mjs";
import { CreateFeatureGrantBody, GrantResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../domains/tenant-features/index.mjs").TenantFeaturesDomain} TenantFeaturesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{tenantFeatures: TenantFeaturesDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, tenantFeatures }) {
  fastify.post(
    "/features",
    {
      schema: {
        body: CreateFeatureGrantBody,
        description:
          "Admin command that grants one feature to a tenant and recomputes effective tenant features.",
        operationId: "createAdminFeatureGrant",
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
        tags: ["admin grants"],
      },
    },
    async function (req, reply) {
      await authenticate({
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

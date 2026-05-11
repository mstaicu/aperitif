import { authenticate } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../shared/schemas.mjs";
import { CreateProductGrantBody, GrantResponse } from "./schemas.mjs";

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
    "/products",
    {
      schema: {
        body: CreateProductGrantBody,
        description:
          "Admin command that grants a product to a tenant and recomputes effective tenant features.",
        operationId: "createAdminProductGrant",
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
        summary: "Grant tenant product",
        tags: ["admin grants"],
      },
    },
    async function (req, reply) {
      await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenantFeatures.createTenantProductGrant({
          grantRef: req.body.grant_ref,
          productCode: req.body.product_code,
          tenantId: req.body.tenant_id,
        }),
      );
    },
  );
}

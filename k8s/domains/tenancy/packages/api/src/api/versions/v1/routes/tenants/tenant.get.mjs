import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { TenantParams, TenantResponse } from "./schemas.mjs";

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
    "/:tenantId",
    {
      schema: {
        description:
          "Fetch a single tenant resource. Memberships and workspaces are exposed through their own tenant sub-resources.",
        operationId: "getTenant",
        params: TenantParams,
        response: {
          200: TenantResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get tenant",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await tenancy.getTenant({
          currentUserId,
          tenantId: req.params.tenantId,
        }),
      );
    },
  );
}

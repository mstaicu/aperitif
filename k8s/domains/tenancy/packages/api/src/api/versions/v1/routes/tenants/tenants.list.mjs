import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { TenantsResponse } from "./schemas.mjs";

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
    "",
    {
      schema: {
        description:
          "List tenants where the authenticated caller has tenant-level authority.",
        operationId: "listTenants",
        response: {
          200: TenantsResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List caller tenants",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await tenancy.listTenants({ currentUserId }));
    },
  );
}

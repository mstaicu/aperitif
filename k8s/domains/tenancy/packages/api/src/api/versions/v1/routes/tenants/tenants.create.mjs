import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { CreateTenantBody, TenantResponse } from "./schemas.mjs";

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
  fastify.post(
    "",
    {
      schema: {
        body: CreateTenantBody,
        description:
          "Create a tenant as the authority root for tenant-scoped product access. The authenticated caller becomes tenant owner, and tenant activation requirements decide whether the tenant starts active or pending.",
        operationId: "createTenant",
        response: {
          201: TenantResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create tenant",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await tenancy.createTenant({
          currentUserId,
          kind: req.body.kind,
          name: req.body.name,
        }),
      );
    },
  );
}

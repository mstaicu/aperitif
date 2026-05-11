import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  CreateWorkspaceBody,
  CreateWorkspaceResponse,
  TenantParams,
} from "./schemas.mjs";

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
    "/:tenantId/workspaces",
    {
      schema: {
        body: CreateWorkspaceBody,
        description:
          "Create a workspace inside a tenant. Tenant owners can create workspaces when a product needs an operational resource container.",
        operationId: "createTenantWorkspace",
        params: TenantParams,
        response: {
          201: CreateWorkspaceResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create tenant workspace",
        tags: ["tenants"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await tenancy.createTenantWorkspace({
          currentUserId,
          name: req.body.name,
          tenantId: req.params.tenantId,
        }),
      );
    },
  );
}

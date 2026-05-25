import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { DocumentsResponse, TenantParams } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/documents/index.mjs").DocumentsService} DocumentsService
 */

/**
 * @param {Fastify} fastify
 * @param {{documents: DocumentsService, jwks: Jwks}} opts
 */
export default async function (fastify, { documents, jwks }) {
  fastify.get(
    "",
    {
      schema: {
        description:
          "List tenant-scoped documents after checking the caller identity, tenant membership, and required tenant capability projection.",
        operationId: "listDocuments",
        params: TenantParams,
        response: {
          200: DocumentsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List documents",
        tags: ["documents"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await documents.listDocuments({
          currentUserId,
          tenantId: req.params.tenant_id,
        }),
      );
    },
  );
}

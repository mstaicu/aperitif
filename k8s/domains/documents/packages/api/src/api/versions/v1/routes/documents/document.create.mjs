import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { CreateDocumentBody, DocumentResponse } from "./schemas.mjs";

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
  fastify.post(
    "",
    {
      schema: {
        body: CreateDocumentBody,
        description:
          "Create a workspace-scoped document after checking the caller identity, tenant membership, workspace ownership, and required tenant capability projection.",
        operationId: "createDocument",
        response: {
          201: DocumentResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create document",
        tags: ["documents"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await documents.createDocument({
          currentUserId,
          title: req.body.title,
          workspaceId: req.body.workspace_id,
        }),
      );
    },
  );
}

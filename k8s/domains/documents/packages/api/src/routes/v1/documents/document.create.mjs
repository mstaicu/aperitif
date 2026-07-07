import { ProblemResponse } from "../../../api/problem-details.mjs";
import { authenticate } from "../../../platform/security/jwt.mjs";
import {
  AccountParams,
  CreateDocumentBody,
  DocumentResponse,
} from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   documents: import("../../../services/documents/index.mjs").DocumentsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export function registerCreateDocumentRoute(
  fastify,
  { documents, jwks, prefix },
) {
  fastify.post(
    prefix,
    {
      schema: {
        body: CreateDocumentBody,
        description:
          "Create a account-scoped document after checking the caller identity, account membership, and required account entitlement projection.",
        operationId: "createDocument",
        params: AccountParams,
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
          accountId: req.params.account_id,
          currentUserId,
          title: req.body.title,
        }),
      );
    },
  );
}

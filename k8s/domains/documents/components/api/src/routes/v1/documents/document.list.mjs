import { authenticate } from "../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../problem-details.mjs";
import { AccountParams, DocumentsResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   documents: import("../../../services/documents/index.mjs").DocumentsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export function registerListDocumentsRoute(
  fastify,
  { documents, jwks, prefix },
) {
  fastify.get(
    prefix,
    {
      schema: {
        description:
          "List account-scoped documents after checking the caller identity, account membership, and required account entitlement projection.",
        operationId: "listDocuments",
        params: AccountParams,
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
          accountId: req.params.account_id,
          currentUserId,
        }),
      );
    },
  );
}

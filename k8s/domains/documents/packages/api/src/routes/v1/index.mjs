import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { registerCreateDocumentRoute } from "./documents/document.create.mjs";
import { registerListDocumentsRoute } from "./documents/document.list.mjs";

/**
 * @param {import("../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   documents: import("../../services/documents/index.mjs").DocumentsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export const registerV1Routes = async (
  fastify,
  { documents, jwks, prefix },
) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            description:
              "Access token carried in the Authorization header as Bearer <token>.",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        description:
          "Documents API for proving account, entitlement, and JWT authorization boundaries.",
        title: "Documents",
        version: "v1",
      },
      servers: [
        {
          url: "/",
        },
      ],
      tags: [
        {
          description: "Account-scoped documents",
          name: "documents",
        },
      ],
    },
  });

  registerCreateDocumentRoute(fastify, {
    documents,
    jwks,
    prefix: `${prefix}/accounts/:account_id/documents`,
  });

  registerListDocumentsRoute(fastify, {
    documents,
    jwks,
    prefix: `${prefix}/accounts/:account_id/documents`,
  });

  await fastify.register(swaggerUI, {
    indexPrefix: prefix,
    routePrefix: `${prefix}/documents/docs`,
  });
};

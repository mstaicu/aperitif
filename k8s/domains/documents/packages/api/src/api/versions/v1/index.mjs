import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import createDocument from "./routes/documents/document.create.mjs";
import listDocuments from "./routes/documents/document.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../services/documents/index.mjs").DocumentsService} DocumentsService
 */

/**
 * @param {Fastify} fastify
 * @param {{
 *   documents: DocumentsService,
 *   jwks: Jwks,
 * }} opts
 */
export default async (fastify, { documents, jwks }) => {
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

  await fastify.register(createDocument, {
    documents,
    jwks,
    prefix: "/accounts/:account_id/documents",
  });

  await fastify.register(listDocuments, {
    documents,
    jwks,
    prefix: "/accounts/:account_id/documents",
  });

  await fastify.register(swaggerUI, {
    indexPrefix: "/v1",
    routePrefix: "/documents/docs",
  });
};

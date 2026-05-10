import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { ProductsResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/products/index.mjs").ProductsDomain} ProductsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{products: ProductsDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { jwks, products }) {
  fastify.get(
    "",
    {
      schema: {
        description: "List products with their included features and offers.",
        operationId: "listProducts",
        response: {
          200: ProductsResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List products",
        tags: ["products"],
      },
    },
    async function (req, reply) {
      await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await products.listProducts());
    },
  );
}

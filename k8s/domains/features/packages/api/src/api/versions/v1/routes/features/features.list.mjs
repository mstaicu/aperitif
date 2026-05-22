import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { FeaturesResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/features/index.mjs").FeaturesService} FeaturesService
 */

/**
 * @param {Fastify} fastify
 * @param {{features: FeaturesService, jwks: Jwks}} opts
 */
export default async function (fastify, { features, jwks }) {
  fastify.get(
    "/",
    {
      schema: {
        description: "List features known to the features domain.",
        operationId: "listFeatures",
        response: {
          200: FeaturesResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List features",
        tags: ["features"],
      },
    },
    async function (req, reply) {
      await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await features.listFeatures());
    },
  );
}

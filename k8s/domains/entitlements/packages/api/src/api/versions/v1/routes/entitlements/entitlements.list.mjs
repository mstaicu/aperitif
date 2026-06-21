import { authenticateOperator } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { EntitlementsResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/entitlements/index.mjs").EntitlementsService} EntitlementsService
 */

/**
 * @param {Fastify} fastify
 * @param {{entitlements: EntitlementsService, jwks: Jwks}} opts
 */
export default async function (fastify, { entitlements, jwks }) {
  fastify.get(
    "/",
    {
      schema: {
        description:
          "Platform operator query that lists entitlements known to the entitlements domain.",
        operationId: "listEntitlements",
        response: {
          200: EntitlementsResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List entitlements",
        tags: ["entitlements"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await entitlements.listEntitlements());
    },
  );
}

import { ProblemResponse } from "../../../api/problem-details.mjs";
import { authenticateOperator } from "../../../platform/security/jwt.mjs";
import { EntitlementsResponse } from "./schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   entitlements: import("../../../services/entitlements/index.mjs").EntitlementsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 *   prefix: string,
 * }} opts
 */
export function registerListEntitlementsRoute(
  fastify,
  { entitlements, jwks, prefix },
) {
  fastify.get(
    prefix,
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

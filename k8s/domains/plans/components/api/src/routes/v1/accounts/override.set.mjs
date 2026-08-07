import { authenticateOperator } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import {
  FeaturesResponse,
  OverrideBody,
  OverrideParams,
} from "./override.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   plans: import("../../../services/plans/index.mjs").PlansService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerSetOverrideRoute(fastify, { jwks, plans }) {
  fastify.put(
    "/v1/accounts/:account_id/overrides/:feature_id",
    {
      schema: {
        body: OverrideBody,
        description: "Set an account feature override.",
        operationId: "setAccountFeatureOverride",
        params: OverrideParams,
        response: {
          200: FeaturesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Set account feature override",
        tags: ["plans"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await plans.setOverride({
          accountId: req.params.account_id,
          featureId: req.params.feature_id,
          value: req.body.value,
        }),
      );
    },
  );
}

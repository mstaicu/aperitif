import { authenticateOperator } from "../../../platform/authentication.mjs";
import { ProblemResponse } from "../../../platform/problem-details.mjs";
import { PlanBody, PlanParams, PlanResponse } from "./plan.schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   plans: import("../../../services/plans/index.mjs").PlansService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerSetPlanRoute(fastify, { jwks, plans }) {
  fastify.put(
    "/v1/accounts/:account_id/plan",
    {
      schema: {
        body: PlanBody,
        description: "Set the current plan for an account.",
        operationId: "setAccountPlan",
        params: PlanParams,
        response: {
          200: PlanResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Set account plan",
        tags: ["plans"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await plans.set({
          accountId: req.params.account_id,
          planId: req.body.plan_id,
        }),
      );
    },
  );
}

import { authenticateOperator } from "../../platform/authentication.mjs";
import { ProblemResponse } from "../../platform/problem-details.mjs";
import { setPlan } from "../../services/plans/set.mjs";
import { PlanBody, PlanParams, PlanResponse } from "./plans.schemas.mjs";

/**
 * @type {import("@fastify/type-provider-typebox").FastifyPluginAsyncTypebox<{
 *   pool: import("pg").Pool,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }>}
 */
export default async function plansRoutes(fastify, { jwks, pool }) {
  fastify.put(
    "/accounts/:account_id/plan",
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
        await setPlan(
          { pool },
          {
            accountId: req.params.account_id,
            planId: req.body.plan_id,
          },
        ),
      );
    },
  );
}

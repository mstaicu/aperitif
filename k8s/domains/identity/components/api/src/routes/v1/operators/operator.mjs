import { authenticateOperator } from "../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../problem-details.mjs";
import { OperatorParams, OperatorResponse } from "./schemas.mjs";

/**
 * @param {import("../../../server.mjs").FastifyInstance} fastify
 * @param {{
 *   jwks: import("../../../platform/security/index.mjs").JwtKeys["jwks"],
 *   operators: import("../../../services/operators/index.mjs").OperatorsService,
 * }} opts
 */
export function registerOperatorRoutes(fastify, { jwks, operators }) {
  fastify.put(
    "/v1/operators/:user_id",
    {
      schema: {
        description: "Assign platform operator access to a user.",
        operationId: "assignOperator",
        params: OperatorParams,
        response: {
          200: OperatorResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Assign operator",
        tags: ["operators"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await operators.assignOperator({
          userId: req.params.user_id,
        }),
      );
    },
  );

  fastify.delete(
    "/v1/operators/:user_id",
    {
      schema: {
        description: "Remove platform operator access from a user.",
        operationId: "revokeOperator",
        params: OperatorParams,
        response: {
          200: OperatorResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Revoke operator",
        tags: ["operators"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await operators.revokeOperator({
          userId: req.params.user_id,
        }),
      );
    },
  );
}

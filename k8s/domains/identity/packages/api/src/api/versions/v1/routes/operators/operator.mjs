import { authenticateOperator } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { OperatorParams, OperatorResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../platform/security/index.mjs").JwtKeys["jwks"]} JsonWebKeySet
 * @typedef {import("../../../../../services/operators/index.mjs").OperatorsService} OperatorsService
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: JsonWebKeySet, operators: OperatorsService}} opts
 */
export default async function (fastify, { jwks, operators }) {
  fastify.put(
    "/:user_id",
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
    "/:user_id",
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

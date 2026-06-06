import { authenticateOperatorPermission } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { OperatorRoleParams, OperatorRoleResponse } from "./schemas.mjs";

const REQUIRED_PERMISSION = "operators.manage";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../platform/context.mjs").Context["security"]} Security
 * @typedef {import("../../../../../services/operators/index.mjs").OperatorsService} OperatorsService
 */

/**
 * @param {Fastify} fastify
 * @param {{operators: OperatorsService, security: Security}} opts
 */
export default async function (fastify, { operators, security }) {
  fastify.put(
    "/:user_id/roles/:role_id",
    {
      schema: {
        description: "Assign a platform operator role to a user.",
        operationId: "assignOperatorRole",
        params: OperatorRoleParams,
        response: {
          200: OperatorRoleResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Assign operator role",
        tags: ["operators"],
      },
    },
    async function (req, reply) {
      await authenticateOperatorPermission({
        audience: security.audience,
        authorization: req.headers.authorization,
        permission: REQUIRED_PERMISSION,
        publicKey: security.verifying.publicKey,
      });

      return reply.send(
        await operators.assignOperatorRole({
          roleId: req.params.role_id,
          userId: req.params.user_id,
        }),
      );
    },
  );

  fastify.delete(
    "/:user_id/roles/:role_id",
    {
      schema: {
        description: "Remove a platform operator role from a user.",
        operationId: "revokeOperatorRole",
        params: OperatorRoleParams,
        response: {
          200: OperatorRoleResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Revoke operator role",
        tags: ["operators"],
      },
    },
    async function (req, reply) {
      await authenticateOperatorPermission({
        audience: security.audience,
        authorization: req.headers.authorization,
        permission: REQUIRED_PERMISSION,
        publicKey: security.verifying.publicKey,
      });

      return reply.send(
        await operators.revokeOperatorRole({
          roleId: req.params.role_id,
          userId: req.params.user_id,
        }),
      );
    },
  );
}

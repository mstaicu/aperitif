import { authenticateOperator } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  AddAccountCapabilitiesBody,
  AddAccountCapabilitiesResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../../services/account-capabilities/index.mjs").AccountCapabilitiesService} AccountCapabilitiesService
 */

/**
 * @param {Fastify} fastify
 * @param {{accountCapabilities: AccountCapabilitiesService, jwks: Jwks}} opts
 */
export default async function (fastify, { accountCapabilities, jwks }) {
  fastify.post(
    "",
    {
      schema: {
        body: AddAccountCapabilitiesBody,
        description:
          "Platform operator command that adds current account capability grants and recomputes effective account capabilities.",
        operationId: "addAccountCapabilities",
        response: {
          200: AddAccountCapabilitiesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Add account capability grants",
        tags: ["capabilities"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accountCapabilities.addAccountCapabilities({
          accountId: req.body.account_id,
          capabilities: req.body.capabilities,
        }),
      );
    },
  );
}

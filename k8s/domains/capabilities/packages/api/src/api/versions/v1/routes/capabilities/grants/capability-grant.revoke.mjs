import { authenticateOperatorPermission } from "../../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../../problem-details.mjs";
import {
  RevokeAccountCapabilitiesBody,
  RevokeAccountCapabilitiesResponse,
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
  fastify.delete(
    "",
    {
      schema: {
        body: RevokeAccountCapabilitiesBody,
        description:
          "Platform operator command that revokes current account capability grants and recomputes effective account capabilities.",
        operationId: "revokeAccountCapabilities",
        response: {
          200: RevokeAccountCapabilitiesResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Revoke account capability grants",
        tags: ["capabilities"],
      },
    },
    async function (req, reply) {
      await authenticateOperatorPermission({
        authorization: req.headers.authorization,
        jwks,
        permission: "capabilities.revoke",
      });

      return reply.send(
        await accountCapabilities.revokeAccountCapabilities({
          accountId: req.body.account_id,
          capabilities: req.body.capabilities,
        }),
      );
    },
  );
}

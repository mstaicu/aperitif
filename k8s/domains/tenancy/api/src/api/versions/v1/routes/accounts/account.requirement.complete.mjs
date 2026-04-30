import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AccountRequirementParams,
  AccountRequirementsResponse,
} from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/tenancy/index.mjs").TenancyDomain} TenancyDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{accounts: TenancyDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { accounts, jwks }) {
  fastify.post(
    "/:accountId/requirements/:type/complete",
    {
      schema: {
        description:
          "Manual/internal seam for marking an account activation requirement completed. Account owners can use this synchronous route while fulfillment domains do not exist; later event consumers should reuse this transaction behind an internal worker path.",
        operationId: "completeAccountRequirement",
        params: AccountRequirementParams,
        response: {
          200: AccountRequirementsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Complete account requirement manually",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await accounts.completeAccountRequirement({
          accountId: req.params.accountId,
          currentUserId,
          type: req.params.type,
        }),
      );
    },
  );
}

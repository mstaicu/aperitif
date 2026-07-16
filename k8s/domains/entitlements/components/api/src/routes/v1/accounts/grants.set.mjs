import { authenticateOperator } from "../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../problem-details.mjs";
import { GrantBody, GrantParams, GrantResponse } from "./grants.schemas.mjs";

/**
 * @param {import("../../../app.mjs").FastifyInstance} fastify
 * @param {{
 *   grants: import("../../../services/grants/index.mjs").GrantsService,
 *   jwks: import("jose").JWTVerifyGetKey,
 * }} opts
 */
export function registerSetGrantRoute(fastify, { grants, jwks }) {
  fastify.put(
    "/v1/accounts/:account_id/grants/:grant_id",
    {
      schema: {
        body: GrantBody,
        description:
          "Create or replace a grant of capabilities for an account.",
        operationId: "setGrant",
        params: GrantParams,
        response: {
          200: GrantResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Set grant",
        tags: ["grants"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await grants.set({
          accountId: req.params.account_id,
          capabilities: req.body.capabilities,
          grantId: req.params.grant_id,
        }),
      );
    },
  );
}

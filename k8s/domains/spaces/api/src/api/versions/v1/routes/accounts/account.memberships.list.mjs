import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountMembershipsResponse, AccountParams } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesDomain}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  fastify.get(
    "/:accountId/memberships",
    {
      schema: {
        description:
          "List account memberships. Account owners can inspect account-level authority; this does not grant space authority.",
        operationId: "listAccountMemberships",
        params: AccountParams,
        response: {
          200: AccountMembershipsResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List account memberships",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await spaces.listAccountMemberships({
          accountId: req.params.accountId,
          currentUserId,
        }),
      );
    },
  );
}

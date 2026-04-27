import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AccountParams, AccountResponse } from "./schemas.mjs";

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
    "/:accountId",
    {
      schema: {
        description:
          "Fetch an account together with the authenticated caller membership and activation requirements.",
        operationId: "getAccount",
        params: AccountParams,
        response: {
          200: AccountResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get account context",
        tags: ["accounts"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await spaces.getAccount({
          accountId: req.params.accountId,
          currentUserId,
        }),
      );
    },
  );
}

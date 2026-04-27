import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { SpaceResponse } from "../spaces/schemas.mjs";
import { AccountParams, CreateAccountSpaceBody } from "./schemas.mjs";

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
  fastify.post(
    "/:accountId/spaces",
    {
      schema: {
        body: CreateAccountSpaceBody,
        description:
          "Create an optional sub-authority context under an account. Account-only products should not create spaces. The caller must be an account owner and becomes explicit owner of the new space.",
        operationId: "createAccountSpace",
        params: AccountParams,
        response: {
          201: SpaceResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create account space",
        tags: ["accounts", "spaces"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await spaces.createAccountSpace({
          accountId: req.params.accountId,
          currentUserId,
          name: req.body.name,
        }),
      );
    },
  );
}

import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpaceParams, SpaceResponse } from "./schemas.mjs";

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
    "/:spaceId",
    {
      schema: {
        description:
          "Fetch a single space together with the authenticated caller membership in that space.",
        operationId: "getSpace",
        params: SpaceParams,
        response: {
          200: SpaceResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get space context",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.send(
          await spaces.get({
            currentUserId,
            spaceId: req.params.spaceId,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "SPACE_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

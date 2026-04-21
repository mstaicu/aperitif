import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpaceCreateResponse } from "./schemas.mjs";

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
    "/",
    {
      schema: {
        description:
          "Create a new space and bootstrap the authenticated caller as its initial owner.",
        operationId: "createSpace",
        response: {
          201: SpaceCreateResponse,
          401: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create caller-owned space",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.code(201).send(
          await spaces.create({
            currentUserId,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

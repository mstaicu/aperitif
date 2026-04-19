import { authenticate } from "../../../../../jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpacesResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesRuntime}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  fastify.get(
    "/",
    {
      schema: {
        description: "List spaces for the authenticated caller.",
        operationId: "listSpaces",
        response: {
          200: SpacesResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List spaces",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.send(await spaces.list({ currentUserId }));
      } catch (err) {
        if (/** @type {Error} */ (err).message === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

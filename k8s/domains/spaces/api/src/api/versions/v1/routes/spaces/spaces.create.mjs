import { authenticate } from "../../../../../jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { CreateSpaceBody, SpaceResponse } from "./schemas.mjs";

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
  fastify.post(
    "/",
    {
      schema: {
        body: CreateSpaceBody,
        description:
          "Create a new space. The creator becomes the initial owner.",
        operationId: "createSpace",
        response: {
          201: SpaceResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create space",
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
        if (/** @type {Error} */ (err).message === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

import { EmptyResponse, ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpaceParams } from "./schemas.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{spaces: SpacesRuntime}} opts
 */
export default async function (fastify, { spaces }) {
  fastify.delete(
    "/:spaceId/members",
    {
      schema: {
        description: "Leave a space as the authenticated caller.",
        operationId: "leaveSpace",
        params: SpaceParams,
        response: {
          204: EmptyResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Leave space",
        tags: ["spaces"],
      },
    },
    async function (req, reply) {
      try {
        // TODO: Replace this bearer-token-as-user-id placeholder with JWT sub extraction.
        const [type, token] = (req.headers.authorization || "").split(" ");

        if (type !== "Bearer" || !token || !UUID_PATTERN.test(token)) {
          return reply.code(401).send(null);
        }

        await spaces.leave({
          currentUserId: token,
          spaceId: req.params.spaceId,
        });

        return reply.code(204).send(null);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "LAST_OWNER") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

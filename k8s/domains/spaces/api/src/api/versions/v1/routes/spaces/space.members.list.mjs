import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpaceMembersResponse, SpaceParams } from "./schemas.mjs";

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
  fastify.get(
    "/:spaceId/members",
    {
      schema: {
        description: "List memberships for a space.",
        operationId: "listSpaceMembers",
        params: SpaceParams,
        response: {
          200: SpaceMembersResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List space members",
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

        return reply.send(
          await spaces.listMembers({
            currentUserId: token,
            spaceId: req.params.spaceId,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "SPACE_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

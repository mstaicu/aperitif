import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { SpacesResponse } from "./schemas.mjs";

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
        // TODO: Replace this bearer-token-as-user-id placeholder with JWT sub extraction.
        const [type, token] = (req.headers.authorization || "").split(" ");

        if (type !== "Bearer" || !token || !UUID_PATTERN.test(token)) {
          return reply.code(401).send(null);
        }

        return reply.send(await spaces.list({ currentUserId: token }));
      } catch (err) {
        return reply.code(500).send(null);
      }
    },
  );
}

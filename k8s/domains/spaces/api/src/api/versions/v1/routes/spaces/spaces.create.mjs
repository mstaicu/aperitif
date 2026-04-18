import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { CreateSpaceBody, SpaceResponse } from "./schemas.mjs";

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
  fastify.post(
    "/",
    {
      schema: {
        body: CreateSpaceBody,
        description: "Create a new space. The creator becomes the initial owner.",
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
        // TODO: Replace this bearer-token-as-user-id placeholder with JWT sub extraction.
        const [type, token] = (req.headers.authorization || "").split(" ");

        if (type !== "Bearer" || !token || !UUID_PATTERN.test(token)) {
          return reply.code(401).send(null);
        }

        return reply.code(201).send(
          await spaces.create({
            currentUserId: token,
          }),
        );
      } catch (err) {
        return reply.code(500).send(null);
      }
    },
  );
}

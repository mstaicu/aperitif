import { authenticateOperator } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../problem-details.mjs";
import { CapabilitiesResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../services/capabilities/index.mjs").CapabilitiesService} CapabilitiesService
 */

/**
 * @param {Fastify} fastify
 * @param {{capabilities: CapabilitiesService, jwks: Jwks}} opts
 */
export default async function (fastify, { capabilities, jwks }) {
  fastify.get(
    "/",
    {
      schema: {
        description:
          "Platform operator query that lists capabilities known to the capabilities domain.",
        operationId: "listCapabilities",
        response: {
          200: CapabilitiesResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "List capabilities",
        tags: ["capabilities"],
      },
    },
    async function (req, reply) {
      await authenticateOperator({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(await capabilities.listCapabilities());
    },
  );
}

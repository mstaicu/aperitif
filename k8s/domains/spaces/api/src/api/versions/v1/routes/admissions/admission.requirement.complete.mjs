import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AdmissionRequirementParams,
  AdmissionStateResponse,
} from "./schemas.mjs";

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
    "/:admissionId/requirements/:type/complete",
    {
      schema: {
        description:
          "Mark an admission requirement completed. Space owners can use this synchronous route shape; later event consumers should reuse this transaction behind an internal worker path. When all requirements are complete and the admission is claimed, spaces completes the admission and creates the membership.",
        operationId: "completeAdmissionRequirement",
        params: AdmissionRequirementParams,
        response: {
          200: AdmissionStateResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Complete admission requirement",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.send(
        await spaces.completeAdmissionRequirement({
          admissionId: req.params.admissionId,
          currentUserId,
          type: req.params.type,
        }),
      );
    },
  );
}

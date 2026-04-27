import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, AdmissionStateResponse } from "./schemas.mjs";

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
    "/:admissionId",
    {
      schema: {
        description:
          "Fetch the current state of an admission and its requirement rows. The caller must be the bound admission user or an owner of the target space for unclaimed space-bound admissions.",
        operationId: "getAdmission",
        params: AdmissionParams,
        response: {
          200: AdmissionStateResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Get admission state",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      const result = await spaces.getAdmission({
        admissionId: req.params.admissionId,
        currentUserId,
      });

      return reply.send(result);
    },
  );
}

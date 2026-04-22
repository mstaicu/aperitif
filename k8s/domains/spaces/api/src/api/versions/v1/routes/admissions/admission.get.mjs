import { authenticateOptional } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, AdmissionStateResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/admissions/index.mjs").AdmissionsDomain} AdmissionsDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{admissions: AdmissionsDomain, jwks: Jwks}} opts
 */
export default async function (fastify, { admissions, jwks }) {
  fastify.get(
    "/:admissionId",
    {
      schema: {
        description:
          "Fetch the current state of an admission together with the currently known requirement rows.",
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
        summary: "Get admission state",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticateOptional({
        authorization: req.headers.authorization,
        jwks,
      });

      const result = await admissions.get({
        admissionId: req.params.admissionId,
        currentUserId,
      });

      return reply.send(result);
    },
  );
}

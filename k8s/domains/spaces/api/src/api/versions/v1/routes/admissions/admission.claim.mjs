import { authenticate } from "../../../../../platform/security/jwt.mjs";
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
  fastify.post(
    "/:admissionId/claim",
    {
      schema: {
        description:
          "Bind the authenticated subject to an admission and return the full admission state, including the current requirement rows.",
        operationId: "claimAdmission",
        params: AdmissionParams,
        response: {
          200: AdmissionStateResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          404: ProblemResponse,
          409: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Claim admission and return state",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      const result = await admissions.claim({
        admissionId: req.params.admissionId,
        currentUserId,
      });

      return reply.send(result);
    },
  );
}

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
      try {
        const currentUserId = await authenticate({
          authorization: req.headers.authorization,
          jwks,
        });

        const result = await admissions.claim({
          admissionId: req.params.admissionId,
          currentUserId,
        });

        return reply.send(result);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.type("application/problem+json").code(401).send({
            status: 401,
            title: "Invalid access token",
            type: "/problems/invalid-access-token",
          });
        }

        if (code === "ADMISSION_NOT_FOUND") {
          return reply.type("application/problem+json").code(404).send({
            status: 404,
            title: "Admission not found",
            type: "/problems/admission-not-found",
          });
        }

        if (code === "ADMISSION_CLAIMED") {
          return reply.type("application/problem+json").code(409).send({
            status: 409,
            title: "Admission already claimed",
            type: "/problems/admission-claimed",
          });
        }

        if (code === "ADMISSION_NOT_OPEN") {
          return reply.type("application/problem+json").code(409).send({
            status: 409,
            title: "Admission not open",
            type: "/problems/admission-not-open",
          });
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.type("application/problem+json").code(503).send({
            status: 503,
            title: "Database unavailable",
            type: "/problems/database-unavailable",
          });
        }

        return reply.type("application/problem+json").code(500).send({
          status: 500,
          title: "Internal server error",
          type: "/problems/internal-server-error",
        });
      }
    },
  );
}

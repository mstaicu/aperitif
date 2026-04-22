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
      try {
        const currentUserId = await authenticateOptional({
          authorization: req.headers.authorization,
          jwks,
        });

        const result = await admissions.get({
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

        if (code === "FORBIDDEN") {
          return reply.type("application/problem+json").code(403).send({
            status: 403,
            title: "Forbidden",
            type: "/problems/forbidden",
          });
        }

        if (code === "ADMISSION_NOT_FOUND") {
          return reply.type("application/problem+json").code(404).send({
            status: 404,
            title: "Admission not found",
            type: "/problems/admission-not-found",
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

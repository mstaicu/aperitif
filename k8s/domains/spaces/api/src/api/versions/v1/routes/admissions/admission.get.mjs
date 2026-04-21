import { authenticateOptional } from "../../../../../platform/security/jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, GetAdmissionResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("@sinclair/typebox").Static<typeof GetAdmissionResponse>} GetAdmissionResponseType
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
          200: GetAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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
          return reply.code(401).send(null);
        }

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "ADMISSION_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

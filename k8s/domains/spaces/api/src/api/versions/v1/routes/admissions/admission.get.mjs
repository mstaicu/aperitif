import { authenticateOptional } from "../../../../../jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, GetAdmissionResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../runtime/admissions/index.mjs").AdmissionsRuntime} AdmissionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{admissions: AdmissionsRuntime, jwks: Jwks}} opts
 */
export default async function (fastify, { admissions, jwks }) {
  fastify.get(
    "/:admissionId",
    {
      schema: {
        description: "Fetch the current state of an admission.",
        operationId: "getAdmission",
        params: AdmissionParams,
        response: {
          200: GetAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Get admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      try {
        const currentUserId = await authenticateOptional({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.send(
          await admissions.get({
            admissionId: req.params.admissionId,
            currentUserId,
          }),
        );
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

        return reply.code(500).send(null);
      }
    },
  );
}

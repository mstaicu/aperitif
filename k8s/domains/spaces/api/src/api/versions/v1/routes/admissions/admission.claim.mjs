import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, ClaimAdmissionResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("@sinclair/typebox").Static<typeof ClaimAdmissionResponse>} ClaimAdmissionResponseType
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
          200: ClaimAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
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

        /** @type {ClaimAdmissionResponseType} */
        const result = /** @type {ClaimAdmissionResponseType} */ (
          await admissions.claim({
            admissionId: req.params.admissionId,
            currentUserId,
          })
        );

        return reply.send(result);
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "ADMISSION_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "ADMISSION_CLAIMED") {
          return reply.code(409).send(null);
        }

        if (code === "ADMISSION_NOT_OPEN") {
          return reply.code(409).send(null);
        }

        if (code === "DATABASE_UNAVAILABLE") {
          return reply.code(503).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

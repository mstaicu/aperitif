import { ErrorResponse } from "../../../../shared/schemas.mjs";
import {
  AdmissionParams,
  ClaimAdmissionBody,
  ClaimAdmissionResponse,
} from "./schemas.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/admissions/index.mjs").AdmissionsRuntime} AdmissionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{admissions: AdmissionsRuntime}} opts
 */
export default async function (fastify, { admissions }) {
  fastify.post(
    "/:admissionId/claim",
    {
      schema: {
        body: ClaimAdmissionBody,
        description: "Bind the authenticated subject to an admission.",
        operationId: "claimAdmission",
        params: AdmissionParams,
        response: {
          200: ClaimAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
          500: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Claim admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      try {
        // TODO: Replace this bearer-token-as-user-id placeholder with JWT sub extraction.
        const [type, token] = (req.headers.authorization || "").split(" ");

        if (type !== "Bearer" || !token || !UUID_PATTERN.test(token)) {
          return reply.code(401).send(null);
        }

        return reply.send(
          await admissions.claim({
            admissionId: req.params.admissionId,
            currentUserId: token,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "ADMISSION_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        if (code === "ADMISSION_CLAIMED") {
          return reply.code(409).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

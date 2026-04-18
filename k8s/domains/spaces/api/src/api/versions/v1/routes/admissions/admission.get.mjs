import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, GetAdmissionResponse } from "./schemas.mjs";

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
        // TODO: Replace this bearer-token-as-user-id placeholder with JWT sub extraction.
        let currentUserId = null;

        if (req.headers.authorization) {
          const [type, token] = req.headers.authorization.split(" ");

          if (type !== "Bearer" || !token || !UUID_PATTERN.test(token)) {
            return reply.code(401).send(null);
          }

          currentUserId = token;
        }

        return reply.send(
          await admissions.get({
            admissionId: req.params.admissionId,
            currentUserId,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

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

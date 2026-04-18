import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { CreateAdmissionBody, CreateAdmissionResponse } from "./schemas.mjs";

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
    "/",
    {
      schema: {
        body: CreateAdmissionBody,
        description:
          "Create a pending admission. Authentication is optional at this stage.",
        operationId: "createAdmission",
        response: {
          201: CreateAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Create admission",
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

        return reply.code(201).send(
          await admissions.create({
            currentUserId,
            requirements: req.body.requirements,
            requested_role: req.body.requested_role,
            space_id: req.body.space_id,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "SPACE_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

import { authenticateOptional } from "../../../../../jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import { CreateAdmissionBody, CreateAdmissionResponse } from "./schemas.mjs";

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
        const currentUserId = await authenticateOptional({
          authorization: req.headers.authorization,
          jwks,
        });

        return reply.code(201).send(
          await admissions.create({
            currentUserId,
            requested_role: req.body.requested_role,
            requirements: req.body.requirements,
            space_id: req.body.space_id,
          }),
        );
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "SPACE_NOT_FOUND") {
          return reply.code(404).send(null);
        }

        return reply.code(500).send(null);
      }
    },
  );
}

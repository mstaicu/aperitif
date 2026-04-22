import { authenticateOptional } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AdmissionStateResponse } from "./schemas.mjs";

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
    "/",
    {
      schema: {
        description:
          "Create a self-started admission for first-space onboarding. Authentication is optional at this stage. The response includes the admission resource and the derived requirement rows.",
        operationId: "createAdmission",
        response: {
          201: AdmissionStateResponse,
          401: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        summary: "Create self-started admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticateOptional({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await admissions.createSelfStarted({
          currentUserId,
        }),
      );
    },
  );
}

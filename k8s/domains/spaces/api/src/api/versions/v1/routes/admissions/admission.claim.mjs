import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import { AdmissionParams, AdmissionStateResponse } from "./schemas.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesDomain}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  fastify.post(
    "/:admissionId/claim",
    {
      schema: {
        description:
          "Claim an unbound admission for a space as the authenticated user.",
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
        summary: "Claim unbound admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      const result = await spaces.claimAdmission({
        admissionId: req.params.admissionId,
        currentUserId,
      });

      return reply.send(result);
    },
  );
}

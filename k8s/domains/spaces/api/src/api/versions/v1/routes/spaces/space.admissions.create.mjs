import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ProblemResponse } from "../../../../shared/schemas.mjs";
import {
  AdmissionStateResponse,
  SpaceAdmissionBody,
} from "../admissions/schemas.mjs";
import { SpaceParams } from "./schemas.mjs";

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
    "/:spaceId/admissions",
    {
      schema: {
        body: SpaceAdmissionBody,
        description:
          "Create an admission for an existing space. Intended for owners. The response includes the admission resource and the derived requirement rows.",
        operationId: "createSpaceAdmission",
        params: SpaceParams,
        response: {
          201: AdmissionStateResponse,
          400: ProblemResponse,
          401: ProblemResponse,
          403: ProblemResponse,
          404: ProblemResponse,
          500: ProblemResponse,
          503: ProblemResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create space-bound admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      const currentUserId = await authenticate({
        authorization: req.headers.authorization,
        jwks,
      });

      return reply.code(201).send(
        await spaces.createAdmission({
          currentUserId,
          requested_role: req.body.requested_role,
          spaceId: req.params.spaceId,
        }),
      );
    },
  );
}

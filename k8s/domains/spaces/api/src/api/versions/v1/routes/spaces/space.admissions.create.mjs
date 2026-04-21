import { authenticate } from "../../../../../platform/security/jwt.mjs";
import { ErrorResponse } from "../../../../shared/schemas.mjs";
import {
  CreateAdmissionResponse,
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
          201: CreateAdmissionResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
          500: ErrorResponse,
          503: ErrorResponse,
        },
        security: [{ bearerAuth: [] }],
        summary: "Create space-bound admission",
        tags: ["admissions"],
      },
    },
    async function (req, reply) {
      try {
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
      } catch (err) {
        const code = /** @type {Error} */ (err).message;

        if (code === "INVALID_ACCESS_TOKEN") {
          return reply.code(401).send(null);
        }

        if (code === "FORBIDDEN") {
          return reply.code(403).send(null);
        }

        if (code === "SPACE_NOT_FOUND") {
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

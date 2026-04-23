import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import claimAdmission from "./routes/admissions/admission.claim.mjs";
import getAdmission from "./routes/admissions/admission.get.mjs";
import createAdmission from "./routes/admissions/admissions.create.mjs";
import createSpaceAdmission from "./routes/spaces/space.admissions.create.mjs";
import destroySpace from "./routes/spaces/space.delete.mjs";
import getSpace from "./routes/spaces/space.get.mjs";
import deleteSpaceMember from "./routes/spaces/space.member.delete.mjs";
import createSpaceMember from "./routes/spaces/space.members.create.mjs";
import listSpaceMembers from "./routes/spaces/space.members.list.mjs";
import createSpace from "./routes/spaces/spaces.create.mjs";
import listSpaces from "./routes/spaces/spaces.list.mjs";

/**
 * @typedef {import("../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 * @typedef {import("../../../domains/admissions/index.mjs").AdmissionsDomain} AdmissionsDomain
 * @typedef {import("../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{domains: {
 *   admissions: AdmissionsDomain,
 *   spaces: SpacesDomain,
 * }, jwks: Jwks}} opts
 */
export default async (fastify, { domains, jwks }) => {
  await fastify.register(swagger, {
    openapi: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: "JWT",
            description:
              "Access token carried in the Authorization header as Bearer <token>.",
            scheme: "bearer",
            type: "http",
          },
        },
      },
      info: {
        description:
          "Authority API for space lifecycle, memberships, and admissions.",
        title: "Spaces",
        version: "v1",
      },
      servers: [
        {
          url: "/spaces",
        },
      ],
      tags: [
        {
          description: "Space lifecycle and membership management",
          name: "spaces",
        },
        {
          description: "Admissions and requirement tracking",
          name: "admissions",
        },
      ],
    },
  });

  await fastify.register(swaggerUI, {
    routePrefix: "/docs",
  });

  await fastify.register(listSpaces, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(getSpace, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(destroySpace, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(createSpaceAdmission, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(listSpaceMembers, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(createSpace, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(createSpaceMember, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(deleteSpaceMember, {
    jwks,
    prefix: "/spaces",
    spaces: domains.spaces,
  });
  await fastify.register(createAdmission, {
    admissions: domains.admissions,
    jwks,
    prefix: "/admissions",
  });
  await fastify.register(getAdmission, {
    admissions: domains.admissions,
    jwks,
    prefix: "/admissions",
  });
  await fastify.register(claimAdmission, {
    admissions: domains.admissions,
    jwks,
    prefix: "/admissions",
  });
};

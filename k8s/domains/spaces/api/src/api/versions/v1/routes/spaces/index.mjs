import createAdmission from "./space.admissions.create.mjs";
import destroy from "./space.delete.mjs";
import get from "./space.get.mjs";
import deleteMember from "./space.member.delete.mjs";
import createMember from "./space.members.create.mjs";
import listMembers from "./space.members.list.mjs";
import create from "./spaces.create.mjs";
import list from "./spaces.list.mjs";

/**
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 *
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../domains/spaces/index.mjs").SpacesDomain} SpacesDomain
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesDomain}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  await fastify.register(list, { jwks, spaces });
  await fastify.register(get, { jwks, spaces });
  await fastify.register(destroy, { jwks, spaces });
  await fastify.register(createAdmission, { jwks, spaces });
  await fastify.register(listMembers, { jwks, spaces });
  await fastify.register(create, { jwks, spaces });
  await fastify.register(createMember, { jwks, spaces });
  await fastify.register(deleteMember, { jwks, spaces });
}

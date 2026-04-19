import get from "./space.get.mjs";
import leave from "./space.leave.mjs";
import deleteMember from "./space.member.delete.mjs";
import createMember from "./space.members.create.mjs";
import listMembers from "./space.members.list.mjs";
import create from "./spaces.create.mjs";
import list from "./spaces.list.mjs";

/**
 * @typedef {import("jose").JWTVerifyGetKey} Jwks
 *
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{jwks: Jwks, spaces: SpacesRuntime}} opts
 */
export default async function (fastify, { jwks, spaces }) {
  await fastify.register(list, { jwks, spaces });
  await fastify.register(get, { jwks, spaces });
  await fastify.register(listMembers, { jwks, spaces });
  await fastify.register(create, { jwks, spaces });
  await fastify.register(createMember, { jwks, spaces });
  await fastify.register(deleteMember, { jwks, spaces });
  await fastify.register(leave, { jwks, spaces });
}

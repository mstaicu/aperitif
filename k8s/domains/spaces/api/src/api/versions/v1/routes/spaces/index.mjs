import create from "./spaces.create.mjs";
import createMember from "./space.members.create.mjs";
import deleteMember from "./space.member.delete.mjs";
import get from "./space.get.mjs";
import leave from "./space.leave.mjs";
import list from "./spaces.list.mjs";
import listMembers from "./space.members.list.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/spaces/index.mjs").SpacesRuntime} SpacesRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{spaces: SpacesRuntime}} opts
 */
export default async function (fastify, { spaces }) {
  await fastify.register(list, { spaces });
  await fastify.register(get, { spaces });
  await fastify.register(listMembers, { spaces });
  await fastify.register(create, { spaces });
  await fastify.register(createMember, { spaces });
  await fastify.register(deleteMember, { spaces });
  await fastify.register(leave, { spaces });
}

import loginChallenge from "./login.challenge.mjs";
import login from "./login.mjs";
import registerChallenge from "./register.challenge.mjs";
import register from "./register.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/index.mjs").Runtime} Runtime
 */

/**
 * @param {Fastify} fastify
 * @param {{runtime: Runtime}} opts
 */
export default async function (fastify, { runtime }) {
  await fastify.register(loginChallenge, { runtime });
  await fastify.register(login, { runtime });
  await fastify.register(registerChallenge, { runtime });
  await fastify.register(register, { runtime });
}

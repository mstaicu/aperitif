import loginChallenge from "./login.challenge.mjs";
import login from "./login.mjs";
import registerChallenge from "./register.challenge.mjs";
import register from "./register.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 * @param {import('../../../../../fastify.js').WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  await fastify.register(loginChallenge, { runtime });
  await fastify.register(login, { runtime });
  await fastify.register(registerChallenge, { runtime });
  await fastify.register(register, { runtime });
}

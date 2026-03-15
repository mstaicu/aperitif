import loginChallenge from "./login.challenge.mjs";
import login from "./login.mjs";
import registerChallenge from "./register.challenge.mjs";
import register from "./register.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function passkeyRoutes(fastify) {
  await fastify.register(loginChallenge);
  await fastify.register(login);
  await fastify.register(registerChallenge);
  await fastify.register(register);
}

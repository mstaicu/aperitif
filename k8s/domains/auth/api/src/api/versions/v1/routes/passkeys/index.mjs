import loginChallenge from "./login.challenge.mjs";
import login from "./login.mjs";
import registerChallenge from "./register.challenge.mjs";
import register from "./register.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/passkeys/index.mjs").PasskeysRuntime} PasskeysRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{passkeys: PasskeysRuntime}} opts
 */
export default async function (fastify, { passkeys }) {
  await fastify.register(loginChallenge, { passkeys });
  await fastify.register(login, { passkeys });
  await fastify.register(registerChallenge, { passkeys });
  await fastify.register(register, { passkeys });
}

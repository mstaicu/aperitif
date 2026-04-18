import refresh from "./refresh.mjs";
import token from "./token.mjs";

/**
 * @typedef {import("../../../../../app.mjs").FastifyInstance} Fastify
 * @typedef {import("../../../../../runtime/sessions/index.mjs").SessionsRuntime} SessionsRuntime
 */

/**
 * @param {Fastify} fastify
 * @param {{sessions: SessionsRuntime}} opts
 */
export default async function (fastify, { sessions }) {
  await fastify.register(refresh, { sessions });
  await fastify.register(token, { sessions });
}

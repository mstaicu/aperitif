import refresh from "./refresh.mjs";
import token from "./token.mjs";

/**
 * @param {import("../../../../../fastify.js").FastifyInstance} fastify
 * @param {import("../../../../../fastify.js").WithRuntime} opts
 */
export default async function (fastify, opts) {
  const { runtime } = opts;

  await fastify.register(refresh, { runtime });
  await fastify.register(token, { runtime });
}
